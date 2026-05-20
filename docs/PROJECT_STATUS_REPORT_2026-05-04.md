# Illusory Studio 项目现状分析与后续规划报告（2026-05-04）

## 1) 项目现状（代码实态）

### 后端（`server/src`）
已具备可运行的 Express + SQLite 基础能力，核心链路可用：
- 健康检查：`GET /api/health`
- 会话读取：`GET /api/conversations/current`、`GET /api/conversations/:id/messages`
- 素材上传与读取：`POST /api/assets/upload`、`GET /api/assets/:id/file`
- 生成主链路（Mock）：`POST /api/generate`、`GET /api/results/:id/download`
- 结果操作：`POST /api/results/:id/save-to-assets`、`POST /api/results/:id/regenerate`
- 资源下载（Mock）：`POST /api/resources/download`
- 工作台数据：`GET /api/assets`、`GET /api/asset-library`、`GET /api/templates`、`GET /api/personas`、`GET /api/jobs`
- 配置：`GET/PATCH /api/providers`、`GET/PATCH /api/config`

数据库 schema 已包含 `providers / conversations / assets / messages / jobs / results / templates / personas` 等核心表，且有默认 seed 数据。

### 测试现状
本地执行 `npm test`（2026-05-04）结果：
- `5` 个测试文件全部通过
- `18` 条测试全部通过

测试重点覆盖：
- 上传重命名（`图片1/视频1`）
- `@图片N` 提及解析与生成链路
- 结果下载与保存资产
- 资源下载 mock
- provider 配置更新

### 前端（存在“双轨并存”）
当前存在两套前端实现：
1. **实际构建入口（生效）**：`src/main.jsx -> src/App.jsx`
   - 渲染 `illusory_studio_mockup_reference.jsx`
   - 以高保真 mock 交互为主（偏演示）
2. **另一套 API 驱动页面（未接入构建入口）**：`client/src/*`
   - 已实现与后端 API 对接的页面逻辑
   - 但不在当前根 `vite` 的实际入口链路中

这意味着：**当前线上可构建版本与 API 驱动实现并未统一**。

---

## 2) 与 PRD / 计划对照结论

### 已达成（第一阶段基础）
- 后端基础架构与数据落库完整
- 上传重命名与 `@` 提及主链路可跑通
- 生成结果可下载、可保存资产
- 模板/人像/任务/资产等工作台 API 已具雏形

### 未完全达成 / 缺口
- 仍以 **Mock Adapter** 为主，尚未完成脚本真实调用闭环
- PRD 中若干接口未落地（如 jobs cancel/retry、results use-as-first-frame、资产删除、provider test、会话创建等）
- 前端“展示层（mock）”与“业务层（API 驱动）”割裂，影响后续迭代效率与验收口径
- 前端测试主要验证 mock 交互，不等价于真实 API 集成验收

---

## 3) 主要风险

1. **架构分叉风险**：`src/` 与 `client/src/` 双轨长期并存，会造成需求实现与验收对象不一致。
2. **验收错位风险**：测试通过不代表 PRD 功能闭环已真实可用（目前更多验证 mock 行为）。
3. **接入风险**：真实脚本调用（图像/视频/资源）与作业状态管理尚未系统化（队列、超时、取消、重试）。

---

## 4) 建议的后续规划（优先级）

### P0（先统一主干，1~2 天）
- 选定唯一前端主线（建议保留 API 驱动版本并并入当前 `src` 入口）
- 清理或归档非主线 UI，避免“双轨”继续扩散
- 统一测试目标：新增至少 1 组前后端集成回归（非纯 mock UI）

### P1（补齐 PRD 第一阶段关键缺口，2~4 天）
- 补齐关键接口：
  - `POST /api/jobs/:id/cancel`
  - `POST /api/jobs/:id/retry`
  - `POST /api/results/:id/use-as-first-frame`
  - `DELETE /api/assets/:id`
  - `POST /api/providers/:id/test`
  - `POST /api/conversations`
- 同步完善对应测试与错误码约定

### P2（真实适配器落地，3~6 天）
- 从 mock 迁移到可配置 adapter 执行层（先 image，再 video，再 resource）
- 形成统一作业生命周期：`queued/running/succeeded/failed/cancelled`
- 增加执行日志、超时控制、失败回放信息

### P3（产品体验与可运维性，持续）
- 任务页强化（筛选、重试、失败诊断）
- 资产页强化（搜索、标签、批量动作）
- 设置页强化（连接测试、默认参数模板）

---

## 5) 建议的验收里程碑

- **M1（架构统一）**：仅保留一个前端主线并可跑通“上传→@引用→生成→保存资产”
- **M2（接口补齐）**：PRD 第一阶段关键 API 与测试齐套
- **M3（真实执行）**：至少图片链路改为真实 adapter，非 mock
- **M4（稳定验收）**：端到端主流程 + 回归测试稳定通过

---

## 6) 一句话结论

项目已完成“可演示、可测试的第一版骨架”，但仍处于 **Mock 驱动 + 双前端分叉** 状态；下一步应先做主干统一，再补关键 API，最后推进真实脚本适配，以确保 PRD 验收口径与工程实现一致。
