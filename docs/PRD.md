# Illusory Studio PRD v1.0

> 项目路径：`<repo-root>/`
> 产品名称：**Illusory Studio**  
> 文档用途：交付给下一位设计师 / 前端 / 后端开发，作为重新实现 Web 产品的唯一需求依据。  
> 当前结论：之前实现不合格。后续实现应以本 PRD 为准，不沿用失败 UI 细节。

---

## 0. 一句话结论

Illusory Studio 是一个**淡色系毛玻璃风格的对话式 AI 图片 / 视频 / 资源创作工作台**。用户在底部 Composer 上传素材、输入提示词、通过 `@图片1 / @视频1 / @音频1 / @人像1 / @模板1` 引用素材或库内容，点击生成；结果进入中间历史流和资产库。后台通过可配置脚本适配器调用现有图片、视频、资源下载能力，但创作页不暴露脚本、endpoint、key、本地路径等技术细节。

---

## 1. 背景与问题

### 1.1 已有能力

IllusoryDream 本地已有以下能力：

1. **图片生成**
   - 当前脚本：`<repo-root>/skills/gpt2image.py`
   - 现阶段默认模型：GPT Image 2
   - 默认 endpoint 从设置页或 `GPT2IMAGE_ENDPOINT` / `GPT2IMAGE_BASE_URL` 注入，不在源码中写死

2. **视频生成**
   - 当前脚本：`<repo-root>/skills/seedance_video.py`
   - 当前主力模型：`doubao-seedance-2-0-260128`
   - Seedance / PixelDance / Seaweed 系列

3. **资源获取**
   - 本地组件：`res-downloader`
   - 当前服务：`127.0.0.1:8899`
   - 用于抖音、小红书等社交平台素材获取

4. **资产管理与直播生产**
   - 图片、视频、参考素材最终服务于虚拟人直播、短视频、直播间视觉资产、封面、首帧、换装展示等业务。

### 1.2 之前原型失败原因

后续开发必须避免以下问题：

1. **不能做成传统后台**
   - 不要左侧菜单 + 右侧表单堆砌。
   - 不要每个页面只放标题、说明文字、几个输入框。
   - 用户要的是创作工作台，不是管理系统。

2. **不能做成暗黑风**
   - 整体视觉必须保持淡色系毛玻璃。
   - 可以有深色文字、低饱和阴影，但不能是黑色 SaaS / Linear 暗黑风。

3. **子页面必须是真功能页面**
   - 探索、创作、资源、任务、资产、设置都必须有真实可操作模块。
   - 不能只写“资源获取说明”“任务说明”“资产说明”。

4. **前台不能暴露技术细节**
   - 创作页不显示 script path。
   - 创作页不显示 endpoint。
   - 创作页不显示 API key。
   - 创作页不显示本地输出路径。
   - 创作页不出现 `dry-run`。
   - 创作页不出现“确认生成”。
   - 创作页不出现命令行预览。

5. **不能照搬参考图**
   - 可参考对话式结构、Composer、素材引用方式。
   - 视觉和业务必须结合 Illusory Studio 自己的虚拟人 / 直播 / 图片视频创作场景。

---

## 2. 产品定位

### 2.1 产品定义

Illusory Studio 是一个面向虚拟人直播内容生产的本地 AI 创作中控台，负责统一管理：

- 图片创作
- 视频创作
- 社交媒体资源获取
- 素材库
- 虚拟人像库
- 模板库
- 资产库
- 任务中心
- 模型与脚本配置

### 2.2 目标用户

1. **主用户：直播导演 / 运营 / 内容制作人**
   - 需要快速生成虚拟人封面、首帧、直播视觉、短视频素材。
   - 不关心底层脚本和 API，只关心结果。

2. **高级用户：技术管理员 / 模型接入人员**
   - 在设置模块配置 endpoint、key、model、script、默认参数。
   - 维护脚本适配器和任务执行环境。

### 2.3 产品原则

| 原则 | 要求 |
|---|---|
| 对话式创作 | 初始状态中心 Composer；生成后中间历史流 + 底部 Composer |
| 淡色毛玻璃 | 浅色低饱和背景、半透明卡片、大圆角、轻阴影 |
| 功能真实 | 每个页面都有可操作功能，不放空说明页 |
| 用户语言 | 用“生成、下载、编辑、保存到资产库”等产品词 |
| 技术隔离 | 技术字段只在设置页出现 |
| 脚本适配器 | 每个模型独立脚本，不做万能参数抽象 |
| 素材引用 | 用户通过 `@` 明确引用图片/视频/音频/人像/模板 |
| 结果闭环 | 生成结果可下载、编辑、重新生成、生成视频、保存资产 |

---

## 3. 视觉与设计规范

### 3.1 整体风格

必须是：

```text
淡色系 / 毛玻璃 / 简约 / 商业 Web App / 响应式 / 移动端友好
```

关键词：

- 浅色背景
- 低饱和渐变
- 半透明白色卡片
- blur / glassmorphism
- 大圆角
- 柔和阴影
- 蓝紫主色
- 青绿色辅助色
- 粉色轻点缀
- 充足留白
- 精致但不空洞

### 3.2 禁止风格

- 禁止暗黑主背景。
- 禁止纯后台管理系统风。
- 禁止密集表格后台。
- 禁止把页面做成脚本控制台。
- 禁止只有文字说明没有功能组件。
- 禁止照搬参考站视觉。

### 3.3 推荐设计 token

```css
--bg: #f7f8fd;
--card: rgba(255,255,255,0.72);
--card-strong: rgba(255,255,255,0.88);
--text-main: #171b2a;
--text-secondary: #344057;
--text-muted: #7d879b;
--line: rgba(93,108,145,0.16);
--blue: #5b7cfa;
--violet: #8a75ff;
--cyan: #68d7cd;
--pink: #f5a7c9;
--shadow: 0 24px 80px rgba(96,113,155,0.16);
--radius-card: 24px;
--radius-button: 14px;
```

### 3.4 页面背景

背景应由浅色渐变组成，例如：

- 左上：淡紫
- 右上：淡青
- 底部：淡粉
- 主色基底：浅灰白

不能是一片死白，也不能是一片黑。

### 3.5 组件质感

所有主要模块应使用：

- `background: rgba(255,255,255,0.6~0.85)`
- `backdrop-filter: blur(18px~28px)`
- `border: 1px solid rgba(255,255,255,0.7~0.9)`
- `box-shadow: soft shadow`
- `border-radius: 20px~28px`

---

## 4. 信息架构

### 4.1 顶层导航

左侧窄导航：

```text
Logo
探索
创作
资源
任务
资产
设置
用户头像
```

要求：

- 左侧导航窄栏，不要传统宽后台侧边栏。
- 当前选中项高亮。
- 每个导航项必须跳转到真实页面。

### 4.2 主工作区结构

整体采用对话式工作台：

```text
顶部 Header
├── 产品名 Illusory Studio
├── 副标题
└── 顶部快捷切换：灵感 / 创建 / 结果库

中间 Feed / 子页面内容区
├── 初始状态：欢迎引导 + 推荐模板
├── 生成后：历史会话流 / 结果卡
└── 非创作页：功能模块网格

底部 Composer，仅创作页显示
├── 上传图片/视频/音频
├── Prompt 输入
├── @ 引用弹窗
├── 参数 chips
└── 生成按钮
```

### 4.3 顶部快捷切换

- `灵感` → 探索页
- `创建` → 创作页
- `结果库` → 资产页

---

## 5. 核心页面需求

## 5.1 创作页

### 5.1.1 初始状态

当没有历史记录时：

- Composer 居中显示。
- 上方显示欢迎语：
  - `从一句描述开始创作`
- 推荐 3~4 个模板卡。
- 不显示脚本、路径、endpoint。

### 5.1.2 有历史状态

当已有生成记录时：

- 中间区域显示历史流。
- 底部固定 Composer。
- 用户可上滑查看旧记录。

### 5.1.3 Composer 结构

Composer 必须包含：

1. **上传入口**
   - 按钮文案：`图片 / 视频 / 音频`
   - 支持多文件上传。
   - 文件上传后展示在素材 chip 区。

2. **Prompt 输入框**
   - placeholder 示例：
     ```text
     使用 @ 引用素材或虚拟人像，如：参考 @图片1 的人物身份，结合 @模板1 的直播封面结构，生成 9:16 商业视觉图。
     ```

3. **@ 引用系统**
   - 输入 `@` 弹出引用面板。
   - 面板中可选择：图片、视频、音频、人像、模板、资产。
   - 每一项展示缩略图、别名、类型。

4. **参数 chips**
   - 模式：图片生成 / 视频生成
   - 比例：1:1 / 9:16 / 16:9
   - 清晰度：2K / 720p / 1080p
   - 数量：1张 / 2张 / 4张
   - 视频时长：5秒 / 10秒 / 15秒
   - 声音：开 / 关
   - 模型：GPT Image 2 / Seedance 2.0

5. **生成按钮**
   - 主按钮文案：`生成`
   - 不叫“确认生成”。
   - 不叫“dry-run”。

### 5.1.4 历史结果卡

每条历史记录包含：

- 创建时间
- Prompt 原文
- 引用素材 chips
- 参数 chips
- 状态：排队中 / 生成中 / 已完成 / 失败
- 结果预览
- 操作按钮：
  - 编辑
  - 重新生成
  - 下载图片 / 下载视频
  - 用作视频首帧
  - 生成视频
  - 保存到资产库
  - 删除

### 5.1.5 编辑动作

点击编辑：

- 打开右侧或弹窗编辑面板。
- 用户可修改 prompt、参数、引用素材。
- 可选择“以此为基础重新生成”。

## 5.2 探索页

探索页不是说明页。它应包含：

1. **今日创作台 Hero**
   - 显示当前推荐工作流。
   - CTA：`开始创作`。

2. **快捷工作流**
   - 直播封面
   - 出场首帧
   - 换装展示
   - 商品带货图
   - 视频转首帧
   - 参考图生成视频

3. **推荐模板区**
   - 模板卡片可点击。
   - 点击后跳到创作页，并把模板 prompt、参数、素材需求带入 Composer。

4. **虚拟人像入口**
   - 展示 Veya、Luna 等人物卡。
   - 点击人物后跳到创作页，并插入 `@人像N` 或选择该人像为默认参考。

5. **最近项目 / 最近结果**
   - 展示最近 6 个生成结果。
   - 可点击进入详情或继续编辑。

## 5.3 资源页

资源页必须是可操作的资源工作台。

### 5.3.1 功能模块

1. **链接输入区**
   - 输入框 placeholder：
     ```text
     粘贴抖音 / 小红书 / 视频 / 图片链接
     ```
   - 主按钮：`获取资源`

2. **平台快捷入口**
   - 抖音无水印
   - 小红书原图
   - 视频提取
   - 图片批量

3. **资源策略卡**
   - 原图优先
   - 无水印优先
   - 保存 metadata
   - 自动入素材库

4. **任务进度区**
   - 解析中
   - 下载中
   - 已完成
   - 失败原因

5. **最近素材区**
   - 资源网格卡片。
   - 每张卡包含缩略图、类型、来源平台、文件名、下载、用作参考。

### 5.3.2 资源获取结果动作

每个资源结果支持：

- 下载
- 保存到素材库
- 用作图片参考
- 用作视频参考
- 查看来源链接
- 删除

## 5.4 任务页

任务页必须是真任务中心，不是列表说明。

### 5.4.1 顶部统计

- 全部任务数
- 运行中
- 已完成
- 失败
- 今日消耗 / 生成次数

### 5.4.2 任务列表

每条任务展示：

- 任务 ID
- 类型：图片 / 视频 / 资源
- 模型 / provider
- 状态
- 创建时间
- 耗时
- 结果数量
- 错误信息

### 5.4.3 任务操作

- 查看详情
- 取消任务
- 重试
- 打开结果
- 删除任务

## 5.5 资产页

资产页是正式结果库。

### 5.5.1 顶部统计

- 全部资产
- 图片资产
- 视频资产
- 音频资产
- 已收藏

### 5.5.2 筛选与搜索

- 类型筛选：全部 / 图片 / 视频 / 音频 / 人像 / 模板
- 项目筛选
- 标签筛选
- 搜索框

### 5.5.3 资产网格

每个资产卡包含：

- 缩略图 / 视频封面
- 名称
- 类型
- 尺寸 / 时长
- 创建时间
- 来源任务
- 标签

### 5.5.4 资产操作

- 下载
- 编辑
- 重新生成
- 用作视频首帧
- 加入当前创作引用
- 收藏
- 删除

## 5.6 设置页

设置页可以暴露技术字段，但必须设计成清晰配置中心。

### 5.6.1 模型配置

每个模型配置卡包含：

- 名称
- 类型：image / video / resource
- provider
- endpoint
- API key 引用名，不直接明文显示 key
- model
- script path
- 默认参数
- enabled 开关
- 测试连接按钮
- 保存按钮

### 5.6.2 脚本适配器配置

必须支持多个独立脚本：

- `gpt2image.py`
- `seedance_video.py`
- `res-downloader`
- 未来新增：`seedream_image.py`

注意：不要把所有模型硬塞进一个万能脚本。

### 5.6.3 全局配置

- workspaceRoot
- assetRoot
- tempRoot
- res-downloader URL
- 默认项目
- 默认图片参数
- 默认视频参数

---

## 6. 素材上传与 @ 引用规则

### 6.1 上传命名

用户上传文件后，前端展示别名，不展示真实文件名作为主名称。

规则：

| 类型 | 用户可见别名 | 后端存储名示例 |
|---|---|---|
| 图片 | 图片1 | image_001.png |
| 图片 | 图片2 | image_002.jpg |
| 视频 | 视频1 | video_001.mp4 |
| 音频 | 音频1 | audio_001.wav |
| 人像 | 人像1 | persona_001 |
| 模板 | 模板1 | template_001 |
| 资产 | 资产1 | asset_001.png |

### 6.2 @ 面板

输入 `@` 后弹出面板：

- 最近上传
- 素材库
- 虚拟人像库
- 模板库
- 资产库

每项展示：

- 缩略图
- 别名
- 类型
- 简短说明

点击后插入 token，例如：

```text
@图片1
@视频1
@人像1
@模板1
```

### 6.3 Prompt 示例

```text
参考 @人像1 的人物身份，参考 @图片1 的服装材质，使用 @模板1 的直播封面构图，生成 9:16 高级商业视觉图。
```

### 6.4 后端解析

后端保存：

- prompt 原文
- mentions 数组
- mention 到 asset/persona/template 的映射
- 上传顺序
- 文件路径
- 缩略图路径

给模型脚本时：

- 多图参考 prompt 用“第一张图片 / 第二张图片”自然语言指代。
- 不使用 `<image1>` 等特殊标签。
- 不把 URL 塞进 prompt 冒充垫图。

---

## 7. 模型与脚本适配器原则

### 7.1 核心原则

不同厂商、不同模型参数不同，不能做过度万能抽象。

正确方式：

```text
前端统一产品交互
        ↓
后端根据 modelId 找到 provider 配置
        ↓
调用对应 adapter
        ↓
adapter 调用对应脚本
```

### 7.2 固化脚本清单

所有高频生成/资源脚本源目录统一固化在：

```text
<external-source-skills>/
```

同时，为了让 Illusory Console 项目交付时自包含，必须在项目内保留一份脚本副本：

```text
<repo-root>/skills/
```

后端第一版应优先从项目内副本读取脚本路径，配置默认值如下：

```text
<repo-root>/skills/gpt2image.py
<repo-root>/skills/seedance_video.py
```

源目录仍作为主维护目录；如果源目录脚本升级，需要同步复制到项目内 `skills/` 目录。

这是项目级执行脚本目录，不是 Hermes 技能说明目录。后续 Web 后端只能通过该目录中的通用参数化脚本调用能力，禁止为某个角色、某次任务临时新建一次性脚本。

### 7.2.1 脚本是否要做成独立服务

第一阶段**不建议**把 `gpt2image.py`、`seedance_video.py` 直接各自改造成长期运行的独立微服务。推荐架构是：

```text
Illusory Studio Web/API Server
        ↓
统一 Job Queue / Adapter Layer
        ↓
通过子进程调用固化脚本 gpt2image.py / seedance_video.py
        ↓
脚本执行完成后返回 stdout / metadata / output file
```

原因：

1. **当前脚本已经是稳定 CLI 形态**：参数清晰，适合被后端任务队列调用。
2. **生成任务是长耗时异步任务**：更适合 job worker，而不是前端同步 HTTP 请求直接等待。
3. **避免过早微服务化**：每个脚本单独起服务会引入端口、进程管理、鉴权、日志、健康检查、部署复杂度。
4. **便于模型差异隔离**：每个 adapter 知道如何把产品参数翻译成对应脚本参数即可。
5. **方便后续替换**：未来某个脚本稳定后，可以再把 adapter 从 `child_process spawn` 切换成 HTTP service，不影响前端。

推荐第一阶段后端结构：

```text
server/
├── routes/
│   ├── generate.ts
│   ├── resources.ts
│   └── jobs.ts
├── adapters/
│   ├── gptImageAdapter.ts      # spawn gpt2image.py
│   ├── seedanceAdapter.ts      # spawn seedance_video.py
│   └── resDownloaderAdapter.ts # HTTP 调用 res-downloader
├── workers/
│   └── generationWorker.ts
└── services/
    ├── jobService.ts
    ├── assetService.ts
    └── providerService.ts
```

也就是说：**res-downloader 保持独立服务；图片/视频生成脚本第一阶段保持 CLI，由 Web 后端统一调度。**

什么时候再把脚本升级为服务：

- 并发量明显上来，需要常驻 worker 池；
- 脚本初始化成本很高，反复启动浪费时间；
- 需要跨机器调用；
- 需要独立扩容图片/视频生成能力；
- 需要队列 worker 长驻进程和健康检查。

届时可以演进为：

```text
Illusory Studio API
        ↓
Job Queue
        ↓
Image Worker Service / Video Worker Service
        ↓
内部仍复用 gpt2image.py / seedance_video.py 或直接调用 SDK
```

但第一版不要把所有东西拆成微服务，避免项目复杂度失控。

当前已存在脚本：

| 脚本 | 能力 | 类型 | 说明 |
|---|---|---|---|
| `<repo-root>/skills/gpt2image.py` | 文生图 / 图生图 / 多图参考生图 | 图片生成 adapter | GPT Image 2 通用脚本。不传 `--image` 时走 text-to-image；传一个或多个 `--image` 时走 image edit / reference generation。 |
| `<repo-root>/skills/seedance_video.py` | 文生视频 / 图生视频 / 多模态参考生视频 | 视频生成 adapter | Seedance 2.0 通用参数化脚本。支持 `--image`、`--video`、`--audio`，可指定 first_frame / reference_image / reference_video / reference_audio。 |
| `<repo-root>/skills/generate_waiting_room.py` | 待机室视频旧脚本 | legacy only | 旧的一次性/半固化脚本，只能作为历史兼容或参数参考，不作为新任务主入口。 |
| `<repo-root>/skills/gpt2image_generation.md` | 图片生成说明 | 文档 | 可作为 gpt2image 使用说明参考。 |
| `<repo-root>/skills/songkran_prompt.md` | 提示词文档 | 文档 | 历史提示词资料。 |

### 7.3 图片脚本：gpt2image.py

脚本路径：

```text
<repo-root>/skills/gpt2image.py
```

用途：

- 文生图 T2I
- 图生图 I2I
- 多图参考生成
- 虚拟人封面、直播图、换装图、商品图等图片资产

CLI 参数：

```bash
python3 <repo-root>/skills/gpt2image.py \
  "中文提示词" \
  -o /path/to/output.png \
  -s 1024x1792 \
  -q high \
  --image /path/to/ref1.png \
  --image /path/to/ref2.png \
  --endpoint "$GPT2IMAGE_ENDPOINT"
```

参数说明：

| 参数 | 必填 | 说明 |
|---|---|---|
| `prompt` | 是 | 中文提示词 |
| `-o / --output` | 是 | 后端自动生成输出路径，前台不让用户填写 |
| `-s / --size` | 否 | `1024x1024` / `1792x1024` / `1024x1792` |
| `-q / --quality` | 否 | `low` / `medium` / `high` |
| `--image` | 否 | 参考图路径，可重复传多个；传入后自动走 edits 接口 |
| `--endpoint` | 否 | 设置页配置，不在创作页展示 |

前端到脚本映射：

| 前端字段 | 后端/脚本字段 |
|---|---|
| prompt | CLI 第一个位置参数 |
| ratio=9:16 + resolution=2K | `-s 1024x1792` |
| ratio=16:9 + resolution=2K | `-s 1792x1024` |
| ratio=1:1 | `-s 1024x1024` |
| quality | `-q` |
| @图片N / @人像N / @资产N | 解析为对应本地文件路径并按顺序传 `--image` |
| output | 由后端生成，不暴露给用户 |

注意：多图参考 prompt 不使用 `<image1>` 标签，应使用自然语言，例如“第一张图片作为人物身份，第二张图片作为服装参考”。

### 7.4 视频脚本：seedance_video.py

脚本路径：

```text
<repo-root>/skills/seedance_video.py
```

用途：

- 文生视频 T2V
- 图生视频 I2V
- 首帧生视频
- 多图参考生视频
- 参考视频 / 参考音频生视频
- 虚拟人出场、直播间动态背景、首帧转视频、短视频片段

CLI 参数：

```bash
python3 <repo-root>/skills/seedance_video.py \
  --prompt "中文视频提示词" \
  --output /path/to/output.mp4 \
  --image /path/to/first_frame.png:first_frame \
  --image /path/to/ref.png:reference_image \
  --video /path/to/ref.mp4:reference_video \
  --audio /path/to/ref.wav:reference_audio \
  --ratio 9:16 \
  --resolution 720p \
  --duration 5 \
  --generate-audio false \
  --model doubao-seedance-2-0-260128 \
  --base-url "$ARK_BASE_URL"
```

参数说明：

| 参数 | 必填 | 说明 |
|---|---|---|
| `--prompt` | 是 | 中文视频提示词 |
| `--output / -o` | 是 | 输出 MP4，后端自动生成路径 |
| `--image` | 否 | 图片路径/URL，可加 `:first_frame`、`:last_frame`、`:reference_image` |
| `--video` | 否 | 参考视频，可加 `:reference_video` |
| `--audio` | 否 | 参考音频，可加 `:reference_audio` |
| `--ratio` | 否 | 默认 `9:16` |
| `--resolution` | 否 | 默认 `720p` |
| `--duration` | 否 | 秒数，支持 4~15 或 -1，按模型能力为准 |
| `--generate-audio` | 否 | `true` / `false` |
| `--model` | 否 | 默认 `doubao-seedance-2-0-260128` |
| `--base-url` | 否 | 火山引擎 Ark API Base URL |
| `--poll-interval` | 否 | 轮询间隔 |

前端到脚本映射：

| 前端字段 | 后端/脚本字段 |
|---|---|
| prompt | `--prompt` |
| mode=图生视频 / 用作视频首帧 | `--image path:first_frame` |
| @图片N / @人像N / @资产N | `--image path:reference_image` 或首帧模式下 `:first_frame` |
| @视频N | `--video path:reference_video` |
| @音频N | `--audio path:reference_audio` |
| ratio | `--ratio` |
| resolution | `--resolution` |
| duration | `--duration` |
| audio=true/false | `--generate-audio true/false` |

Seedance 注意事项：

- 本地文件必须由脚本转为 Data URI，不能直接传 `file://`。
- Prompt 中不要使用 `<image1>` 等标签，用“第一张图片 / 第二张图片”。
- 易穿模、场景变形时，优先使用固定机位和光影编排约束。
- 大尺度运镜要拆成多机位/多任务，不要在一个 prompt 里强行复杂运镜。

### 7.5 资源脚本 / 服务：res-downloader

资源获取不由 Web 后端自行解析平台。默认统一调用本地 res-downloader 服务：

```text
http://127.0.0.1:8899
```

用途：

- 抖音无水印视频
- 小红书原图
- 社交媒体图片 / 视频素材获取
- metadata 保存

Web 只负责：

1. 接收用户输入 URL。
2. 创建资源任务。
3. 调用 res-downloader。
4. 把下载结果入素材库。
5. 提供“用作参考图 / 用作参考视频 / 下载 / 保存到资产库”。

不要在前端暴露 res-downloader 内部接口细节。

### 7.6 第一版 adapter 映射

| 能力 | modelId | adapter | script / service |
|---|---|---|---|
| 文生图 | gpt-image-2 | script | `<repo-root>/skills/gpt2image.py` |
| 图生图 / 多图参考图 | gpt-image-2 | script | `<repo-root>/skills/gpt2image.py --image ...` |
| 文生视频 | seedance-2 | script | `<repo-root>/skills/seedance_video.py` |
| 图生视频 / 首帧视频 | seedance-2 | script | `<repo-root>/skills/seedance_video.py --image ...:first_frame` |
| 多模态参考视频 | seedance-2 | script | `<repo-root>/skills/seedance_video.py --image/--video/--audio` |
| 资源获取 | res-local | service | `http://127.0.0.1:8899` |

### 7.7 未来新增模型

如果新增 Seedream：

- 新建脚本：`<repo-root>/skills/seedream_image.py`
- 新增 provider 配置。
- 不改造 `gpt2image.py` 去兼容 Seedream。

如果新增其他视频模型：

- 新建独立脚本，例如：`<repo-root>/skills/kling_video.py`
- 在 provider 表中新增配置。
- 前端产品交互尽量复用，adapter 层处理模型差异。

---

## 8. API 需求

## 8.1 通用

### GET `/api/health`

返回服务状态。

```json
{
  "ok": true,
  "service": "illusory-console",
  "version": "1.0.0"
}
```

## 8.2 会话

### GET `/api/conversations/current`

返回当前创作会话。

### GET `/api/conversations/:id/messages`

返回历史消息、任务、结果、引用素材。

### POST `/api/conversations`

创建新会话。

## 8.3 上传与素材

### POST `/api/assets/upload`

FormData：

- conversationId
- kind: image / video / audio
- file

返回：

```json
{
  "id": "asset_xxx",
  "kind": "image",
  "alias": "图片1",
  "mention": "@图片1",
  "storageName": "image_001.png",
  "url": "/api/assets/asset_xxx/file"
}
```

### GET `/api/assets`

素材库列表。

### GET `/api/assets/:id/file`

文件下载 / 预览。

### DELETE `/api/assets/:id`

删除素材。

## 8.4 生成

### POST `/api/generate`

请求：

```json
{
  "conversationId": "conv_default",
  "kind": "image",
  "modelId": "gpt-image-2",
  "prompt": "参考 @图片1 生成直播封面",
  "mentions": ["@图片1"],
  "params": {
    "ratio": "9:16",
    "resolution": "2K",
    "count": 1
  }
}
```

返回：

```json
{
  "job": {
    "id": "job_xxx",
    "status": "queued"
  }
}
```

### GET `/api/jobs/:id`

查询任务状态。

### POST `/api/jobs/:id/cancel`

取消任务。

### POST `/api/jobs/:id/retry`

重试任务。

## 8.5 结果

### GET `/api/results/:id/download`

下载结果。

### POST `/api/results/:id/save-to-assets`

保存到资产库。

### POST `/api/results/:id/regenerate`

基于原 prompt / params 重新生成。

### POST `/api/results/:id/use-as-first-frame`

把图片结果带入视频生成 Composer。

## 8.6 资源获取

### POST `/api/resources/download`

请求：

```json
{
  "url": "https://example.com/video",
  "platform": "auto",
  "strategy": {
    "noWatermark": true,
    "preferOriginal": true,
    "saveMetadata": true
  }
}
```

返回资源任务。

## 8.7 模板 / 人像

### GET `/api/templates`

模板库列表。

### GET `/api/personas`

虚拟人像列表。

### POST `/api/templates`

新增模板。

### POST `/api/personas`

新增虚拟人像。

## 8.8 设置

### GET `/api/providers`

模型 / 服务配置列表。

### PATCH `/api/providers/:id`

更新单个 provider。

### POST `/api/providers/:id/test`

测试连接。

---

## 9. 数据库设计建议

第一版可用 SQLite。

### 9.1 providers

```sql
CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  adapter_type TEXT NOT NULL,
  script_path TEXT,
  endpoint TEXT,
  api_key_ref TEXT,
  model TEXT,
  defaults_json TEXT NOT NULL,
  form_schema_json TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 9.2 conversations

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 9.3 messages

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  prompt TEXT NOT NULL,
  mentions_json TEXT NOT NULL,
  params_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

### 9.4 assets

```sql
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  kind TEXT NOT NULL,
  alias TEXT NOT NULL,
  mention TEXT NOT NULL,
  storage_name TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  path TEXT NOT NULL,
  thumbnail_path TEXT,
  source_result_id TEXT,
  saved INTEGER NOT NULL DEFAULT 0,
  tags_json TEXT NOT NULL,
  meta_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

### 9.5 jobs

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  message_id TEXT,
  provider_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  request_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 9.6 results

```sql
CREATE TABLE results (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  path TEXT NOT NULL,
  thumbnail_path TEXT,
  meta_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

### 9.7 templates

```sql
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  prompt TEXT NOT NULL,
  params_json TEXT NOT NULL,
  required_refs_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 9.8 personas

```sql
CREATE TABLE personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mention TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT NOT NULL,
  base_asset_id TEXT,
  params_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## 10. 前端实现建议

### 10.1 推荐技术栈

- Vite
- React
- TypeScript
- Zustand 或 React Context 管理轻量状态
- CSS Modules / Tailwind 均可，但必须严格遵循视觉规范

### 10.2 推荐目录

```text
client/src/
├── app/
│   ├── App.tsx
│   └── routes.ts
├── api/
│   └── client.ts
├── components/
│   ├── layout/
│   ├── composer/
│   ├── cards/
│   ├── assets/
│   └── settings/
├── pages/
│   ├── ExplorePage.tsx
│   ├── CreatePage.tsx
│   ├── ResourcePage.tsx
│   ├── JobsPage.tsx
│   ├── AssetsPage.tsx
│   └── SettingsPage.tsx
├── state/
│   └── studioStore.ts
├── styles/
│   ├── tokens.css
│   └── globals.css
└── types/
    └── studio.ts
```

### 10.3 关键组件

必须拆分，不要全部写在一个 App 文件里。

- `AppShell`
- `SideNav`
- `TopBar`
- `Composer`
- `MentionPicker`
- `UploadTray`
- `ParameterChips`
- `HistoryFeed`
- `ResultCard`
- `TemplateCard`
- `PersonaCard`
- `ResourceIngestPanel`
- `JobTable`
- `AssetGrid`
- `ProviderConfigCard`

---

## 11. 验收标准

### 11.1 视觉验收

必须满足：

- [ ] 整体是淡色系毛玻璃，不是暗黑风。
- [ ] 左侧窄导航视觉清晰。
- [ ] 主内容不是传统后台表单。
- [ ] 卡片具有半透明、blur、大圆角、轻阴影。
- [ ] 移动端布局可用。
- [ ] 每个页面都有功能模块，不是文字说明。

### 11.2 功能验收

- [ ] 点击探索、创作、资源、任务、资产、设置都有页面切换。
- [ ] 创作页可上传文件。
- [ ] 上传文件自动编号为 图片1 / 视频1 / 音频1。
- [ ] 输入 `@` 可弹出引用面板。
- [ ] 点击模板可把 prompt 和参数带入 Composer。
- [ ] 点击人像可插入人像引用。
- [ ] 点击生成创建任务。
- [ ] 任务页能看到任务状态。
- [ ] 结果卡支持下载、编辑、重新生成、保存到资产库。
- [ ] 资源页可输入链接并创建资源任务。
- [ ] 资产页展示保存后的资产。
- [ ] 设置页可编辑 provider 配置。

### 11.3 禁止项验收

创作页不允许出现：

- [ ] dry-run
- [ ] 确认生成
- [ ] script path
- [ ] endpoint
- [ ] API key
- [ ] 本地输出路径
- [ ] 命令行预览

### 11.4 技术验收

- [ ] `npm run build` 通过。
- [ ] `npm test` 通过。
- [ ] API 有基本测试。
- [ ] 文件上传、生成、保存资产、资源任务有测试。
- [ ] 前端关键交互有 E2E 或 Playwright 测试。

---

## 12. 第一阶段交付范围

### 必须交付

1. 淡色毛玻璃 UI。
2. 完整页面导航。
3. 对话式创作页。
4. Composer + 上传 + @ 引用。
5. 模板库、人像库、素材库、资产库入口。
6. 资源页真实功能模块。
7. 任务页真实任务列表。
8. 资产页真实资产网格。
9. 设置页真实配置表单。
10. 后端 API 与 SQLite schema。
11. mock adapter 跑通完整流程。

### 可以暂缓

1. 真实付费 API 调用。
2. OBS 控制。
3. 多用户权限。
4. 云端部署。
5. 复杂素材标注。

---

## 13. 第二阶段交付范围

1. 接入真实 `gpt2image.py`。
2. 接入真实 `seedance_video.py`。
3. 接入真实 res-downloader。
4. 增加任务队列和失败重试。
5. 增加结果详情页。
6. 增加局部编辑 / 重新生成面板。
7. 增加虚拟人像详情管理。
8. 增加模板编辑器。
9. 增加 OBS 素材推送。

---

## 14. 给下一位开发的明确要求

1. 先做 UI 设计稿或高保真页面，不要直接堆代码。
2. 不要改成暗黑风。
3. 不要只做静态页面。
4. 不要把所有功能写进一个 App 文件。
5. 不要在创作页展示技术字段。
6. 不要做空说明页。
7. 每个页面必须有真实交互和状态。
8. 所有按钮要么完成真实动作，要么有明确 disabled / coming soon 状态，不允许假按钮。
9. 先实现 mock 完整闭环，再接真实模型脚本。
10. 交付前必须截图验收每个页面。

---

## 15. 推荐开发顺序

1. 建立设计 token 和 AppShell。
2. 完成 SideNav / TopBar。
3. 完成 CreatePage 静态高保真。
4. 完成 Composer 交互。
5. 完成上传和 @ 引用。
6. 完成 mock generate 流程。
7. 完成 ExplorePage。
8. 完成 ResourcePage。
9. 完成 JobsPage。
10. 完成 AssetsPage。
11. 完成 SettingsPage。
12. 完成 API 和 DB。
13. 补测试。
14. 浏览器逐页截图验收。

---

## 16. 交付物清单

最终交付必须包含：

```text
README.md
PRD.md
DESIGN_SYSTEM.md
API.md
DATABASE.md
client/
server/
tests/
screenshots/
```

截图至少包括：

- 探索页
- 创作初始态
- 创作有历史态
- @ 引用弹窗
- 资源页
- 任务页
- 资产页
- 设置页
- 移动端布局

---

## 17. 最终判断标准

如果用户第一眼觉得这是“后台管理页面”或“Demo 拼装页”，则失败。  
如果用户第一眼觉得这是“一个能真正用于 AI 视觉生产的商业化创作工作台”，则合格。
