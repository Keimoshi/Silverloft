import os
import requests
import json
import base64
import argparse
import sys
import mimetypes
from pathlib import Path


def _load_env_file(path: str):
    """轻量读取 .env，避免依赖 python-dotenv。仅填充当前进程缺失的变量。"""
    env_path = Path(path)
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


env_file = os.environ.get("GPT2IMAGE_ENV_FILE")
if env_file:
    _load_env_file(env_file)


def _decode_and_save(data, output_path: str):
    """兼容 OpenAI 风格 b64_json 或 url 返回；保存第一张图片。"""
    paths = _decode_and_save_all(data, output_path)
    return paths[0]


def _numbered_output_path(output_path: str, index: int, total: int) -> str:
    """多图输出时自动追加 _001/_002；单图保持原路径不变。"""
    if total <= 1:
        return output_path
    path = Path(output_path)
    return str(path.with_name(f"{path.stem}_{index:03d}{path.suffix}"))


def _decode_and_save_item(item, output_path: str):
    if "b64_json" in item:
        img_bytes = base64.b64decode(item["b64_json"])
        with open(output_path, "wb") as f:
            f.write(img_bytes)
        return

    if "url" in item:
        r = requests.get(item["url"], timeout=120)
        r.raise_for_status()
        with open(output_path, "wb") as f:
            f.write(r.content)
        return

    raise ValueError(f"Unexpected image item format: {json.dumps(item, ensure_ascii=False)[:1000]}")


def _decode_and_save_all(data, output_path: str):
    """兼容 OpenAI 风格 b64_json 或 url 返回；保存全部返回图片。"""
    if "data" not in data or len(data["data"]) == 0:
        raise ValueError(f"Unexpected response format, missing data: {json.dumps(data, ensure_ascii=False)[:1000]}")

    items = data["data"]
    saved_paths = []
    total = len(items)
    for i, item in enumerate(items, start=1):
        item_output_path = _numbered_output_path(output_path, i, total)
        _decode_and_save_item(item, item_output_path)
        saved_paths.append(item_output_path)
    return saved_paths


def generate_image(prompt: str, output_path: str, size: str = "1024x1024", quality: str = "high", image_paths=None, endpoint: str = None, n: int = 1):
    """
    调用 gpt-image-2 接口生成图像并保存。
    - 不传 image_paths: /v1/images/generations 文生图
    - 传 image_paths: /v1/images/edits 垫图/参考图生图
    - n: 单次请求期望返回图片数量；如果接口支持多图，会保存全部返回图片
    """
    image_paths = image_paths or []
    if n < 1:
        raise ValueError("n must be >= 1")

    # 优先读取环境变量。仓库内不保留 provider key 或私有 endpoint fallback。
    env_api_key = (
        os.environ.get("GPT2IMAGE_API_KEY")
        or os.environ.get("HENNG_API_KEY")
        or os.environ.get("AI_TOUR_NET_API_KEY")
        or os.environ.get("OPENAI_API_KEY")
        or os.environ.get("AI_TOUR_GPT_API_KEY")
    )
    explicit_endpoint = endpoint
    api_key = env_api_key

    if endpoint:
        url = endpoint
    else:
        default_base = os.environ.get("GPT2IMAGE_BASE_URL")
        if not default_base:
            raise RuntimeError("Set GPT2IMAGE_BASE_URL or pass --endpoint before generating images")
        default_base = default_base.rstrip("/")
        url = f"{default_base}/v1/images/edits" if image_paths else f"{default_base}/v1/images/generations"

    payload = {
        "model": "gpt-image-2",
        "prompt": prompt,
        "size": size,
        "quality": quality,
        "n": n,
    }

    print(f"Sending request to {url}...")
    print(f"Prompt: {prompt}")
    print(f"Size: {size}, Quality: {quality}")
    if image_paths:
        print("Reference images:")
        for p in image_paths:
            print(f" - {p}")

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    try:
        if image_paths:
            # edits 接口通常走 multipart/form-data。兼容单图和多图。
            headers = {}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            files = []
            handles = []
            try:
                for p in image_paths:
                    path = Path(p)
                    mime = mimetypes.guess_type(path.name)[0] or "image/png"
                    fh = open(path, "rb")
                    handles.append(fh)
                    files.append(("image", (path.name, fh, mime)))
                response = requests.post(url, headers=headers, data={k: str(v) for k, v in payload.items()}, files=files, timeout=300)
            finally:
                for fh in handles:
                    fh.close()
        else:
            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            response = requests.post(url, headers=headers, json=payload, timeout=300)

        response.raise_for_status()
        data = response.json()
        saved_paths = _decode_and_save_all(data, output_path)
        if len(saved_paths) == 1:
            print(f"✅ Image successfully generated and saved to: {saved_paths[0]}")
        else:
            print(f"✅ {len(saved_paths)} images successfully generated:")
            for p in saved_paths:
                print(f" - {p}")

        meta_path = output_path + ".json"
        meta = {
            "ok": True,
            "endpoint": url,
            "fields": payload,
            "images": image_paths,
            "output": output_path,
            "saved_outputs": saved_paths,
            "response": {k: data.get(k) for k in ["created", "background", "output_format", "quality", "size", "model", "usage"] if k in data},
        }
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
        print(f"🧾 Metadata saved to: {meta_path}")

    except requests.exceptions.RequestException as e:
        print(f"❌ API Request Failed: {e}")
        if hasattr(e, "response") and e.response is not None:
            print(f"Status Code: {e.response.status_code}")
            print(f"Error Details: {e.response.text}")
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate image using gpt-image-2 API")
    parser.add_argument("prompt", help="提示词 (支持中文)")
    parser.add_argument("-o", "--output", default="generated_image.png", help="输出图片路径 (默认: generated_image.png)")
    parser.add_argument("-s", "--size", choices=["1024x1024", "1792x1024", "1024x1792"], default="1024x1024", help="图片尺寸 (默认: 1024x1024)")
    parser.add_argument("-q", "--quality", choices=["low", "medium", "high"], default="high", help="图片质量 (默认: high)")
    parser.add_argument("--image", action="append", default=[], help="参考图/垫图路径。可重复传多个；传入后自动调用 images/edits。")
    parser.add_argument("--endpoint", default=None, help="覆盖请求地址，例如 $GPT2IMAGE_BASE_URL/v1/images/edits")
    parser.add_argument("-n", "--n", type=int, default=1, help="单次请求生成图片数量；多图会自动保存为 输出名_001.png、输出名_002.png ... 默认: 1")

    args = parser.parse_args()

    generate_image(args.prompt, args.output, args.size, args.quality, image_paths=args.image, endpoint=args.endpoint, n=args.n)
