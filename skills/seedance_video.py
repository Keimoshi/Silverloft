#!/usr/bin/env python3
"""Parameterized Seedance 2.0 video generation CLI.

Reusable script for all Seedance tasks. Do not create one-off per-character scripts.
"""
import argparse
import base64
import mimetypes
import os
import sys
import time
from pathlib import Path
from urllib.request import urlretrieve

try:
    from volcenginesdkarkruntime import Ark
except Exception as exc:
    print(f"IMPORT_ERROR: {exc}", file=sys.stderr)
    sys.exit(2)

MODEL_DEFAULT = "doubao-seedance-2-0-260128"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(errors="ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def to_data_uri(path_or_url: str) -> str:
    if path_or_url.startswith(("http://", "https://", "data:")):
        return path_or_url
    path = Path(path_or_url)
    if not path.exists():
        raise FileNotFoundError(str(path))
    mime, _ = mimetypes.guess_type(str(path))
    if not mime:
        suffix = path.suffix.lower()
        if suffix == ".mp4":
            mime = "video/mp4"
        elif suffix == ".mov":
            mime = "video/quicktime"
        elif suffix == ".png":
            mime = "image/png"
        elif suffix in (".jpg", ".jpeg"):
            mime = "image/jpeg"
        elif suffix in (".mp3", ".mpeg"):
            mime = "audio/mpeg"
        elif suffix == ".wav":
            mime = "audio/wav"
        else:
            mime = "application/octet-stream"
    b64 = base64.b64encode(path.read_bytes()).decode("utf-8")
    return f"data:{mime};base64,{b64}"


def add_media(content: list, media_type: str, spec: str) -> None:
    """Add media to content. spec format: /path/or/url[:role].

    Role defaults:
    - image -> reference_image
    - video -> reference_video
    - audio -> reference_audio
    """
    default_role = {
        "image": "reference_image",
        "video": "reference_video",
        "audio": "reference_audio",
    }[media_type]

    value = spec
    role = default_role
    # Avoid splitting URL scheme like https://. Only treat final colon as role if suffix matches known roles.
    known_roles = {"first_frame", "last_frame", "reference_image", "reference_video", "reference_audio"}
    if ":" in spec:
        maybe_value, maybe_role = spec.rsplit(":", 1)
        if maybe_role in known_roles:
            value, role = maybe_value, maybe_role

    payload = to_data_uri(value)
    if media_type == "image":
        content.append({"type": "image_url", "image_url": {"url": payload}, "role": role})
    elif media_type == "video":
        content.append({"type": "video_url", "video_url": {"url": payload}, "role": role})
    elif media_type == "audio":
        content.append({"type": "audio_url", "audio_url": {"url": payload}, "role": role})


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate video with ByteDance Seedance 2.0 via Volcano Ark API")
    parser.add_argument("--prompt", required=True, help="中文提示词")
    parser.add_argument("--output", "-o", required=True, help="输出 MP4 路径")
    parser.add_argument("--image", action="append", default=[], help="图片路径/URL，可加 :role，如 path.png:reference_image 或 path.png:first_frame")
    parser.add_argument("--video", action="append", default=[], help="视频路径/URL，可加 :role，如 path.mp4:reference_video")
    parser.add_argument("--audio", action="append", default=[], help="音频路径/URL，可加 :role，如 path.mp3:reference_audio")
    parser.add_argument("--ratio", default="9:16", help="画面比例，如 9:16")
    parser.add_argument("--resolution", default="720p", help="分辨率，如 480p/720p（以 API 支持为准）")
    parser.add_argument("--duration", type=int, default=5, help="时长秒数，4-15 或 -1")
    parser.add_argument("--generate-audio", default="false", choices=["true", "false"], help="是否生成音频")
    parser.add_argument("--model", default=MODEL_DEFAULT)
    parser.add_argument("--base-url", default=None)
    parser.add_argument("--env-file", default=None, help="可选 .env 文件路径；用于本地注入 ARK_API_KEY/ARK_BASE_URL")
    parser.add_argument("--poll-interval", type=int, default=10)
    args = parser.parse_args()

    if args.env_file:
        load_env_file(Path(args.env_file))

    api_key = os.environ.get("ARK_API_KEY")
    base_url = args.base_url or os.environ.get("ARK_BASE_URL")
    if not api_key:
        print("ERROR: ARK_API_KEY is not set", file=sys.stderr)
        return 3
    if not base_url:
        print("ERROR: ARK_BASE_URL is not set and --base-url was not provided", file=sys.stderr)
        return 3

    content = [{"type": "text", "text": args.prompt}]
    for item in args.image:
        add_media(content, "image", item)
    for item in args.video:
        add_media(content, "video", item)
    for item in args.audio:
        add_media(content, "audio", item)

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    client = Ark(base_url=base_url, api_key=api_key)
    print(f"SUBMIT model={args.model} ratio={args.ratio} resolution={args.resolution} duration={args.duration} audio={args.generate_audio}")
    result = client.content_generation.tasks.create(
        model=args.model,
        content=content,
        generate_audio=(args.generate_audio == "true"),
        ratio=args.ratio,
        resolution=args.resolution,
        duration=args.duration,
    )
    task_id = result.id
    print(f"TASK_ID={task_id}", flush=True)

    while True:
        task = client.content_generation.tasks.get(task_id=task_id)
        status = task.status
        print(f"STATUS={status}", flush=True)
        if status == "succeeded":
            video_url = task.content.video_url
            print(f"VIDEO_URL={video_url}")
            urlretrieve(video_url, out_path)
            print(f"OUT_PATH={out_path}")
            print(f"OUT_BYTES={out_path.stat().st_size}")
            return 0
        if status == "failed":
            print(f"FAILED={getattr(task, 'error', None)}", file=sys.stderr)
            return 5
        time.sleep(args.poll_interval)


if __name__ == "__main__":
    raise SystemExit(main())
