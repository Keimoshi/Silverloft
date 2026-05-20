import os
import time
import base64
import mimetypes
import urllib.request
import argparse
from volcenginesdkarkruntime import Ark

def encode_file_to_base64(file_path):
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type is None:
        if file_path.lower().endswith('.png'):
            mime_type = 'image/png'
        elif file_path.lower().endswith(('.jpg', '.jpeg')):
            mime_type = 'image/jpeg'
        else:
            mime_type = 'application/octet-stream'
            
    with open(file_path, "rb") as f:
        encoded_string = base64.b64encode(f.read()).decode('utf-8')
    return f"data:{mime_type};base64,{encoded_string}"

def generate_video(first_frame, output_path):
    api_key = os.environ.get("ARK_API_KEY")
    base_url = os.environ.get("ARK_BASE_URL")
    if not api_key or not base_url:
        raise RuntimeError("ARK_API_KEY and ARK_BASE_URL must be set in the environment")
    if not first_frame:
        raise RuntimeError("Set WAITING_ROOM_FIRST_FRAME or pass --first-frame")
    if not output_path:
        raise RuntimeError("Set WAITING_ROOM_OUTPUT or pass --output")

    client = Ark(
        base_url=base_url,
        api_key=api_key,
    )
    
    print("正在向火山引擎提交视频生成任务...")
    
    prompt = (
        "[场景设定] 严格保持参考首帧图像的构图、比例和房间大小，绝对不进行任何缩放或广角处理。固定机位，绝对无相机移动，保持画面完全静止。女团直播间的高级待机室场景，背景是弧形排列的五个毛玻璃隔间。最初，所有隔间内部漆黑一片，完全隐藏成员以保持神秘感。\n"
        "[舞蹈动作] 当隔间内的灯亮起时，透过玻璃可以看到女团成员黑色的剪影，正在跳着极其流畅、自然且极具活力的 K-pop 风格舞蹈，肢体动作充满动感且毫不僵硬机械。\n"
        "[光影律动编排]\n"
        "[0:00-0:02] 五个隔间内部完全漆黑，看不到任何剪影。\n"
        "[0:02-0:04] 第一拍：最左侧和最右侧隔间（第1和第5个）内部明亮的冷白光突然亮起，瞬间展现出她们跳舞的剪影。中间的三个隔间保持漆黑。\n"
        "[0:04-0:06] 第二拍：第1和第5个隔间的灯光瞬间熄灭，重新隐入黑暗。同时，中间的三个隔间内部的冷白光亮起，展现她们律动跳舞的剪影。\n"
        "[0:06-0:08] 所有五个隔间的内部灯光开始配合快节奏的重低音鼓点快速交替闪烁，展现女孩们活力四射的舞蹈瞬间。\n"
        "[0:08-0:10] 所有内部灯光完全熄灭，所有隔间再次陷入绝对的黑暗。\n"
        "[关键约束] 绝对禁止任何相机移动，画面必须完全锁定。极高的舞台结构一致性，玻璃隔间必须保持完全静止且不发生形变或缩小。绝对不穿模，角色必须始终稳稳地站在玻璃门后。剪影必须且只能在特定隔间灯光亮起时可见。灯光熄灭时，隔间必须看起来空无一人且漆黑一片。严格基于第一帧原图生成，不改变房间原本的大小！"
    )

    try:
        create_result = client.content_generation.tasks.create(
            model="doubao-seedance-2-0-260128", 
            content=[
                {
                    "type": "text",
                    "text": prompt + " [Audio] 强劲重低音 EDM 音乐，鼓点完美契合光影闪烁的节奏。"
                },
                {
                    "type": "image_url",
                    "image_url": {"url": encode_file_to_base64(first_frame)},
                    "role": "first_frame"
                }
            ],
            generate_audio=True,
            ratio="9:16",
            resolution="720p",
            duration=-1
        )
        task_id = create_result.id
        print(f"✅ 任务提交成功，Task ID: {task_id}")
    except Exception as e:
        print(f"❌ 创建任务失败: {e}")
        return

    print("----- 开始轮询任务状态 (大约需要3-5分钟) -----")
    while True:
        try:
            get_result = client.content_generation.tasks.get(task_id=task_id)
            status = get_result.status
            if status == "succeeded":
                print("🎉 ----- 视频生成成功 -----")
                video_url = get_result.content.video_url
                print(f"👉 视频链接: {video_url}")
                print("正在下载视频到本地...")
                urllib.request.urlretrieve(video_url, output_path)
                print(f"视频已保存至: {output_path}")
                return
            elif status == "failed":
                print("❌ ----- 任务失败 -----")
                print(f"错误详情: {get_result.error}")
                return
            else:
                print(f"当前状态: {status}，请耐心等待，15 秒后重试...")
                time.sleep(15)
        except Exception as e:
            print(f"⚠️ 轮询过程发生网络错误: {e}")
            time.sleep(15)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Generate the legacy waiting-room video.")
    parser.add_argument("--first-frame", default=os.environ.get("WAITING_ROOM_FIRST_FRAME"))
    parser.add_argument("--output", default=os.environ.get("WAITING_ROOM_OUTPUT"))
    args = parser.parse_args()
    generate_video(args.first_frame, args.output)
