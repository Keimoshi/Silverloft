# Illusory Console 固化脚本副本

本目录是 Illusory Studio / Illusory Console 项目内的脚本副本目录，方便下一位开发直接在本项目内查看和接入现有生成能力。

源目录：

```text
<external-source-skills>/
```

项目内副本目录：

```text
<repo-root>/skills/
```

## 文件清单

| 文件 | 用途 | 是否第一版主入口 |
|---|---|---|
| `gpt2image.py` | GPT Image 2 文生图 / 图生图 / 多图参考生成 | 是 |
| `seedance_video.py` | Seedance 2.0 文生视频 / 图生视频 / 多模态参考视频 | 是 |
| `gpt2image_generation.md` | gpt2image 使用说明 / 历史说明 | 参考 |
| `songkran_prompt.md` | 历史提示词资料 | 参考 |
| `generate_waiting_room.py` | 待机室旧视频脚本 | legacy only，不作为新任务主入口 |

## 接入原则

第一版后端不要把这些脚本改成独立服务，建议：

```text
API Server → Job Queue → Adapter → spawn CLI script
```

也就是说：

- 图片 adapter 调用 `skills/gpt2image.py`
- 视频 adapter 调用 `skills/seedance_video.py`
- 资源 adapter 调用本地 `res-downloader` 服务

## 注意

1. 后端可以优先引用本项目内副本，便于项目自包含。
2. 如果源目录脚本升级，需要同步复制到本目录。
3. 不要为单个角色或单次任务新建一次性脚本。
4. 新模型应新增独立通用脚本，例如 `seedream_image.py`、`kling_video.py`。
