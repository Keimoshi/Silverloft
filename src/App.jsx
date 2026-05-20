import React, { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { HistoryFeed } from "./components/ChatFeed";
import { ComposerDock, APP_VERSION } from "./components/Composer";
import { Icon, cn } from "./components/Icon";
import { Button } from "./components/Button";
import { MediaPreview } from "./components/ChatFeed"; // MediaPreview used in AssetLibrary and SaveAssetDialog
import {
  createConversation,
  createProject,
  generateProjectMedia,
  getMediaModels,
  getProviders,
  listConversations,
  listMessages,
  listProjectFiles,
  listProjectMediaTasks,
  listProjects,
  putMessage,
  waitMediaTask,
} from "./api";


const ILLUSORY_PROJECT_ID = "illusory-studio";
const ILLUSORY_PROJECT_NAME = "Illusory Studio";
const MEDIA_TASK_WAIT_TIMEOUT_MS = 25_000;

function mediaTypeFromFile(file = {}) {
  const mime = String(file.mime || file.mimeType || "").toLowerCase();
  const name = String(file.name || file.path || "").toLowerCase();
  if (mime.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/.test(name)) return "video";
  if (mime.startsWith("audio/") || /\.(mp3|wav|m4a|ogg)$/.test(name)) return "audio";
  return "image";
}

function fileUrl(projectId, file = {}) {
  const name = file.path || file.name;
  return name ? `/api/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(name)}` : undefined;
}

function outputExtension(surface) {
  if (surface === "video") return "mp4";
  if (surface === "audio") return "mp3";
  return "png";
}

function createMediaMessageId(taskId) {
  const clean = String(taskId || Date.now()).replace(/[^A-Za-z0-9_-]/g, "_");
  return `msg_media_${clean}`;
}

function outputNameForPayload(payload = {}) {
  const surface = payload.surface || payload.kind || "image";
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `illusory-${surface}-${suffix}.${outputExtension(surface)}`;
}

function normalizeProviderRows(status = {}, mediaModels = {}) {
  const providerStatus = status.providers || {};
  const statusRows = Array.isArray(providerStatus) ? providerStatus : Object.values(providerStatus);
  const modelRows = [...(mediaModels.image || []), ...(mediaModels.video || [])];
  return statusRows.map((provider) => ({
    ...provider,
    name: provider.name || provider.label || provider.id,
    models: modelRows.filter((model) => model.provider === provider.id),
  }));
}

function openDesignFileFromApi(projectId, row) {
  const mediaType = mediaTypeFromFile(row);
  const name = row.originalName || row.name || row.path || "素材";
  const url = fileUrl(projectId, row);
  return {
    id: row.id || row.path || row.name,
    name,
    storageName: row.name || row.path,
    mediaType,
    kind: mediaType,
    folder: normalizeFolder(row.assetFolder || row.folder || "未分类"),
    source: "OpenDesign 项目文件",
    fileUrl: url,
    url,
    downloadUrl: url,
    createdAt: displayTime(row.mtime || row.createdAt),
    meta: row.meta || {},
  };
}

function historyItemFromProducedFile(projectId, message, file, index) {
  const mediaType = mediaTypeFromFile(file);
  const url = fileUrl(projectId, file);
  const params = message.params || message.metadata?.params || {};
  const model = message.model || message.metadata?.model || message.job?.providerId || file.model;
  const surface = message.metadata?.surface || mediaType;
  return {
    id: `${message.id || "message"}-${file.name || file.path || index}`,
    sourceId: file.name || file.path,
    time: displayTime(message.endedAt || message.createdAt),
    title: mediaType === "video" ? "视频生成结果" : "图片生成结果",
    model: providerName(model),
    modelId: model,
    tags: tagsFromParams(params),
    prompt: message.prompt || message.content || "",
    mediaType,
    surface,
    aspect: message.aspect || message.metadata?.aspect || params.aspect,
    params,
    fileUrl: url,
    downloadUrl: url,
    meta: { ...(file.meta || {}), taskId: message.taskId || message.metadata?.taskId },
  };
}

function normalizeFolder(value) {
  return String(value || "").trim().replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
}

function folderDisplayName(folder) {
  const clean = normalizeFolder(folder);
  return clean ? clean.split("/").pop() : "资产库";
}

function parentFolder(folder) {
  const parts = normalizeFolder(folder).split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function getDirectChildFolders(folders, currentFolder) {
  const current = normalizeFolder(currentFolder);
  const result = new Set();
  folders.forEach((raw) => {
    const folder = normalizeFolder(raw);
    if (!folder) return;
    if (!current) {
      result.add(folder.split("/")[0]);
      return;
    }
    if (folder !== current && folder.startsWith(`${current}/`)) {
      const child = folder.slice(current.length + 1).split("/")[0];
      if (child) result.add(`${current}/${child}`);
    }
  });
  return Array.from(result).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

function buildFolderNodes(folders, currentFolder = "") {
  return getDirectChildFolders(folders, currentFolder).map((folder) => ({
    id: folder,
    name: folderDisplayName(folder),
    children: buildFolderNodes(folders, folder),
  }));
}

function runSelfTests() {
  const folders = ["A/B", "A/C", "D", "A/B/E"];
  console.assert(normalizeFolder("/A//B/") === "A/B", "normalizeFolder cleans slashes");
  console.assert(parentFolder("A/B/C") === "A/B", "parentFolder returns parent");
  console.assert(getDirectChildFolders(folders, "").join("|") === "A|D", "root children are direct");
  console.assert(getDirectChildFolders(folders, "A").join("|") === "A/B|A/C", "nested children are direct");
  console.assert(folderDisplayName("直播电商/封面图") === "封面图", "folderDisplayName returns leaf");
}

function displayTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function providerName(providerId) {
  if (providerId === "gpt-image-2") return "GPT Image 2";
  if (providerId === "doubao-seedance-2-0-260128" || providerId === "seedance-2") return "Seedance 2.0";
  return providerId || "未知模型";
}

function tagsFromParams(params = {}) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}: ${value}`);
}

function historyFromMessages(projectId, messages = []) {
  return messages.flatMap((message) => {
    const produced = message.producedFiles || [];
    if (produced.length > 0) {
      return produced.map((file, index) => historyItemFromProducedFile(projectId, message, file, index));
    }
    return (message.results || []).map((result) => {
      const params = message.params || {};
      const providerId = message.model || message.job?.providerId;
      return {
        id: result.id,
        time: displayTime(message.createdAt),
        title: result.kind === "video" ? "视频生成结果" : "图片生成结果",
        model: providerName(providerId),
        modelId: providerId,
        tags: tagsFromParams(params),
        prompt: message.prompt || message.content || "",
        mediaType: result.kind,
        surface: result.kind,
        aspect: message.aspect || params.aspect,
        params,
        fileUrl: result.fileUrl || result.downloadUrl,
        downloadUrl: result.downloadUrl || result.fileUrl,
        meta: result.meta || {},
      };
    });
  }).reverse();
}

function assetFromApi(row) {
  const meta = row.meta || {};
  return {
    id: row.id,
    sourceId: row.sourceResultId,
    name: row.originalName || row.alias || row.storageName,
    mediaType: row.kind,
    folder: normalizeFolder(meta.assetFolder || "未分类"),
    source: row.sourceResultId ? "来自历史生成结果" : "上传素材",
    fileUrl: row.url,
    downloadUrl: row.url,
    createdAt: displayTime(row.createdAt),
    meta,
  };
}

function FolderTree({ folders, selectedFolder, onSelect, showRoot = true, compact = false }) {
  const nodes = buildFolderNodes(folders);
  const renderNode = (node, depth = 0) => (
    <div key={node.id}>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={cn("flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition", selectedFolder === node.id ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50")}
        style={{ paddingLeft: `${8 + depth * 18}px` }}
      >
        <Icon name="folder" />
        <span className="truncate text-sm font-bold">{node.name}</span>
      </button>
      {node.children.map((child) => renderNode(child, depth + 1))}
    </div>
  );
  return (
    <div className={cn("space-y-1", compact && "max-h-64 overflow-auto overscroll-contain pr-1")}>
      {showRoot ? (
        <button type="button" onClick={() => onSelect("")} className={cn("flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition", selectedFolder === "" ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50")}>
          <Icon name="archive" />
          <span className="truncate text-sm font-black">资产库</span>
        </button>
      ) : null}
      {nodes.map((node) => renderNode(node))}
    </div>
  );
}

function ExplorePage({ setActiveSection }) {
  const inspirations = [
    { title: "直播电商爆款封面", type: "图片模板", tags: ["9:16", "高点击", "人物参考"], accent: "from-cyan-400 via-sky-500 to-indigo-600", desc: "适合主播封面、活动预热和促销主图。" },
    { title: "新品发布主视觉", type: "品牌 KV", tags: ["4:5", "高级感", "产品高光"], accent: "from-amber-300 via-orange-400 to-pink-500", desc: "用于新品首发、信息流广告和小红书封面。" },
    { title: "第一人称氛围短片", type: "视频灵感", tags: ["13秒", "镜头运动", "音画同步"], accent: "from-zinc-950 via-zinc-900 to-black", desc: "适合短视频首帧、剧情转场和氛围感素材。" },
    { title: "课程知识类封面", type: "图片模板", tags: ["16:9", "文字区", "清晰结构"], accent: "from-emerald-300 via-teal-400 to-sky-500", desc: "用于课程、直播课、知识付费和公开课海报。" },
  ];
  const categories = ["全部", "电商直播", "品牌营销", "短视频", "课程教育", "产品展示"];
  return (
    <section className="mx-auto max-w-[1280px] px-5 pb-24 pt-6 lg:px-10">
      <div className="mb-6 overflow-hidden rounded-[28px] bg-slate-950 p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black"><Icon name="sparkles" />灵感探索</div>
          <h2 className="text-[32px] leading-10 font-black tracking-tight">从可复用场景开始创作</h2>
          <p className="mt-3 text-sm font-medium leading-7 text-white/70">浏览商业视觉模板、视频镜头方案和高转化提示词结构。选择一个灵感后，可以回到创作页继续编辑并生成。</p>
          <Button onClick={() => setActiveSection("create")} className="mt-5"><Icon name="plus" />进入创作</Button>
        </div>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">{categories.map((item, index) => <button key={item} type="button" className={cn("rounded-2xl px-4 py-2 text-sm font-black transition", index === 0 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-white/75 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600")}>{item}</button>)}</div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {inspirations.map((card) => (
          <article key={card.title} className="overflow-hidden rounded-[26px] bg-white/75 shadow-[0_18px_60px_rgba(77,92,151,0.10)] ring-1 ring-white/80 backdrop-blur-xl">
            <div className={cn("relative h-44 bg-gradient-to-br", card.accent)}><span className="absolute left-4 top-4 rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white backdrop-blur">{card.type}</span></div>
            <div className="p-5">
              <h3 className="font-black text-slate-950">{card.title}</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{card.desc}</p>
              <div className="mt-4 flex flex-wrap gap-2">{card.tags.map((tag) => <span key={tag} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">{tag}</span>)}</div>
              <Button variant="soft" onClick={() => setActiveSection("create")} className="mt-5 w-full"><Icon name="sparkles" />用这个灵感创作</Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SettingsPage() {
  const [workspaceName, setWorkspaceName] = useState("Illusory Studio Team");
  const [autoSave, setAutoSave] = useState(true);
  const [commercialSafe, setCommercialSafe] = useState(true);
  const [assetReview, setAssetReview] = useState(false);

  const settingGroups = [
    {
      title: "工作区设置",
      desc: "管理团队空间、默认项目名称和协作偏好。",
      content: (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12px] leading-4 font-black text-slate-500">工作区名称</span>
            <input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] leading-5 font-bold text-slate-800 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100" />
          </label>
          <div className="rounded-2xl bg-slate-50 p-4 text-[13px] leading-6 font-semibold text-slate-500">当前空间用于管理创作历史、资产库文件夹和团队默认参数。</div>
        </div>
      ),
    },    {
      title: "资产库策略",
      desc: "控制生成结果是否自动保存，以及保存前是否需要人工确认。",
      content: (
        <div className="space-y-3">
          <ToggleRow title="生成成功后自动保存到资产库" desc="开启后，生成图片或视频会默认进入未分类文件夹。" checked={autoSave} onChange={setAutoSave} />
          <ToggleRow title="保存资产前需要人工确认" desc="开启后，仍会弹出保存对话框选择文件夹和资产名称。" checked={assetReview} onChange={setAssetReview} />
        </div>
      ),
    },
    {
      title: "商用与安全",
      desc: "为商用场景预留的授权、合规和内容安全配置。",
      content: (
        <div className="space-y-3">
          <ToggleRow title="开启商用授权安全提示" desc="在创作指令和保存资产时提示授权风险。" checked={commercialSafe} onChange={setCommercialSafe} />
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] leading-6 font-semibold text-emerald-700">当前为前端原型设置，真实上线后应由后端保存到团队配置表。</div>
        </div>
      ),
    },
  ];

  return <section className="mx-auto max-w-[1180px] px-5 pb-24 pt-6 lg:px-10">
    <div className="mb-6">
      <h2 className="text-[24px] leading-8 font-black text-slate-950">设置</h2>
      <p className="mt-1 text-[14px] leading-6 font-medium text-slate-500">配置工作区、创作默认值、资产库策略和商用安全选项。</p>
    </div>
    <div className="grid gap-5">
      {settingGroups.map((group) => <article key={group.title} className="rounded-[26px] bg-white/78 p-6 shadow-[0_18px_60px_rgba(77,92,151,0.10)] ring-1 ring-white/80 backdrop-blur-xl">
        <div className="mb-5 flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
          <div><h3 className="text-[18px] leading-6 font-black text-slate-950">{group.title}</h3><p className="mt-1 text-[13px] leading-5 font-medium text-slate-500">{group.desc}</p></div>
        </div>
        {group.content}
      </article>)}
    </div>
  </section>;
}

function ToggleRow({ title, desc, checked, onChange }) {
  return <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40">
    <span><span className="block text-[14px] leading-5 font-black text-slate-800">{title}</span><span className="mt-0.5 block text-[12px] leading-5 font-medium text-slate-500">{desc}</span></span>
    <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition", checked ? "bg-indigo-600" : "bg-slate-200")}><span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition", checked ? "left-6" : "left-1")} /></span>
  </button>;
}

function ProfilePage({ theme, setTheme }) {
  const plans = [
    { label: "当前套餐", value: "Pro 创作版" },
    { label: "本月生成", value: "186 / 500" },
    { label: "资产空间", value: "12.4GB / 50GB" },
  ];
  const themes = [
    { key: "glass", name: "清透工作台", desc: "浅色玻璃拟态，适合日常创作和展示。", preview: "from-[#f4f2ff] via-[#f8fbff] to-[#e0fbff]" },
    { key: "dark", name: "暗色专注", desc: "深色背景、低干扰对比，适合长时间创作。", preview: "from-slate-950 via-slate-900 to-indigo-950" },
  ];
  return <section className="mx-auto max-w-[1180px] px-5 pb-24 pt-6 lg:px-10">
    <div className="mb-6 flex flex-col gap-4 rounded-[28px] bg-white/78 p-6 shadow-[0_18px_60px_rgba(77,92,151,0.10)] ring-1 ring-white/80 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-slate-800 to-indigo-500 text-xl font-black text-white shadow-lg">U</div>
        <div><h2 className="text-[24px] leading-8 font-black text-slate-950">用户中心</h2><p className="mt-1 text-[14px] leading-6 font-medium text-slate-500">管理个人资料、订阅信息和页面风格。</p></div>
      </div>
      <Button variant="secondary">编辑个人资料</Button>
    </div>

    <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
      <article className="rounded-[26px] bg-white/78 p-6 shadow-[0_18px_60px_rgba(77,92,151,0.10)] ring-1 ring-white/80 backdrop-blur-xl">
        <h3 className="text-[18px] leading-6 font-black text-slate-950">订阅信息</h3>
        <p className="mt-1 text-[13px] leading-5 font-medium text-slate-500">查看当前套餐、用量和资产空间。</p>
        <div className="mt-5 space-y-3">{plans.map((item) => <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-[13px] leading-5 font-semibold text-slate-500">{item.label}</span><span className="text-[14px] leading-5 font-black text-slate-900">{item.value}</span></div>)}</div>
        <Button className="mt-5 w-full">管理订阅</Button>
      </article>

      <article className="rounded-[26px] bg-white/78 p-6 shadow-[0_18px_60px_rgba(77,92,151,0.10)] ring-1 ring-white/80 backdrop-blur-xl">
        <h3 className="text-[18px] leading-6 font-black text-slate-950">页面风格</h3>
        <p className="mt-1 text-[13px] leading-5 font-medium text-slate-500">选择界面主题。切换后会影响页面背景、卡片、文字和缩略图氛围。</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {themes.map((item) => <button key={item.key} type="button" onClick={() => setTheme(item.key)} className={cn("rounded-[22px] border p-3 text-left transition", theme === item.key ? "border-indigo-400 bg-indigo-50 ring-4 ring-indigo-100" : "border-slate-200 bg-white hover:border-indigo-200")}>
            <div className={cn("h-28 rounded-2xl bg-gradient-to-br", item.preview)}><div className="flex h-full items-end p-3"><div className="h-8 w-24 rounded-xl bg-white/60 backdrop-blur" /></div></div>
            <div className="mt-3 flex items-center justify-between gap-2"><span className="text-[15px] leading-5 font-black text-slate-900">{item.name}</span>{theme === item.key ? <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] leading-3 font-black text-white">使用中</span> : null}</div>
            <p className="mt-1 text-[12px] leading-5 font-medium text-slate-500">{item.desc}</p>
          </button>)}
        </div>
      </article>
    </div>
  </section>;
}

function PlaceholderPage({ title, description }) {
  return <section className="mx-auto max-w-[960px] px-5 py-20 text-center lg:px-10"><div className="rounded-[28px] bg-white/75 p-12 shadow-[0_18px_60px_rgba(77,92,151,0.10)] ring-1 ring-white/80 backdrop-blur-xl"><h2 className="text-2xl font-black text-slate-950">{title}</h2><p className="mt-3 text-sm font-semibold leading-7 text-slate-500">{description}</p></div></section>;
}

function ToolsPage() {
  const tools = [
    { title: "提示词优化器", desc: "自动润色和丰富你的创作指令，提高模型生成质量。", icon: "sparkles", accent: "from-indigo-400 to-violet-500" },
    { title: "比例裁剪", desc: "智能识别主体，一键将图片裁剪为常用社交媒体比例。", icon: "box", accent: "from-emerald-400 to-teal-500" },
    { title: "背景移除", desc: "高清去除图片背景，生成透明 PNG 格式素材。", icon: "archive", accent: "from-amber-400 to-orange-500" },
    { title: "画质修复", desc: "对生成的模糊图片进行 4K 超清修复和细节增强。", icon: "refresh", accent: "from-rose-400 to-pink-500" },
  ];

  return (
    <section className="mx-auto max-w-[1280px] px-5 pb-24 pt-6 lg:px-10">
      <div className="mb-6 flex flex-col gap-4 rounded-[28px] bg-indigo-600 p-8 text-white shadow-xl md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-[28px] leading-9 font-black tracking-tight">脚本工具箱</h2>
          <p className="mt-2 text-sm font-medium leading-7 text-indigo-100">这里集成了一系列实用的 AI 处理脚本，帮助你更高效地管理创作流程。选择下方工具立即开始使用。</p>
        </div>
        <Icon name="box" size={48} className="opacity-20 hidden md:block" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {tools.map((tool) => (
          <article key={tool.title} className="group cursor-pointer overflow-hidden rounded-[26px] bg-white/75 p-6 shadow-sm ring-1 ring-white/80 transition-all hover:bg-white hover:shadow-xl hover:-translate-y-1">
            <div className={cn("mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", tool.accent)}>
              <Icon name={tool.icon} />
            </div>
            <h3 className="text-lg font-black text-slate-950">{tool.title}</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{tool.desc}</p>
            <Button variant="ghost" className="mt-5 w-full text-indigo-600 group-hover:bg-indigo-50">立即使用</Button>
          </article>
        ))}
      </div>
    </section>
  );
}

function FolderIconLarge() {
  return <div className="relative mx-auto h-[76px] w-[112px]"><div className="absolute left-2 top-0 h-6 w-[72px] rounded-t-xl bg-sky-300 shadow-sm" /><div className="absolute inset-x-0 bottom-0 h-[66px] rounded-xl bg-gradient-to-b from-sky-300 to-sky-500 shadow-[0_4px_10px_rgba(14,116,144,0.25)] ring-1 ring-sky-300/80" /><div className="absolute inset-x-2 top-7 h-2 rounded-full bg-white/35" /></div>;
}

function AssetLibrary({ assets, folders, activeFolder, setActiveFolder, onCreateFolder, setActiveSection }) {
  const [newFolderName, setNewFolderName] = useState("");
  const childFolders = getDirectChildFolders(folders, activeFolder);
  const currentAssets = assets.filter((asset) => normalizeFolder(asset.folder) === normalizeFolder(activeFolder));
  const crumbs = activeFolder ? activeFolder.split("/") : [];
  function addFolder() {
    const cleanName = normalizeFolder(newFolderName);
    if (!cleanName) return;
    const next = normalizeFolder(activeFolder ? `${activeFolder}/${cleanName}` : cleanName);
    onCreateFolder(next);
    setActiveFolder(next);
    setNewFolderName("");
  }
  return (
    <section className="mx-auto max-w-[1360px] px-5 pb-48 pt-6 lg:px-10">
      <div className="mb-5 flex items-center justify-between"><div><h2 className="text-[20px] leading-7 font-black text-slate-950">资产库</h2><p className="mt-1 text-sm font-medium text-slate-500">访达式图标布局：左侧文件夹树，右侧用大图标展示文件夹、图片和视频资产。</p></div><Button onClick={() => setActiveSection("create")}><Icon name="plus" />继续创作</Button></div>
      <div className="overflow-hidden rounded-[24px] bg-white/82 shadow-[0_18px_70px_rgba(77,92,151,0.10)] ring-1 ring-white/80 backdrop-blur-xl">
        <div className="grid min-h-[640px] lg:grid-cols-[280px_1fr]">
          <aside className="border-r border-slate-200/70 bg-slate-50/75 p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-black text-slate-950">文件夹</h3><span className="text-xs font-bold text-slate-400">{folders.length}</span></div>
            <FolderTree folders={folders} selectedFolder={activeFolder} onSelect={setActiveFolder} />
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3"><p className="mb-2 text-xs font-black text-slate-500">新建文件夹</p><input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addFolder(); }} placeholder="文件夹名称" className="w-full rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none ring-1 ring-slate-100 focus:ring-indigo-200" /><Button variant="soft" onClick={addFolder} className="mt-2 w-full"><Icon name="plus" />在当前文件夹中新建</Button></div>
          </aside>
          <main className="bg-white/80">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-600"><button type="button" onClick={() => setActiveFolder("")} className="rounded-lg px-2 py-1 hover:bg-slate-100">资产库</button>{crumbs.map((crumb, index) => { const folder = crumbs.slice(0, index + 1).join("/"); return <React.Fragment key={folder}><span className="text-slate-300">/</span><button type="button" onClick={() => setActiveFolder(folder)} className="rounded-lg px-2 py-1 hover:bg-slate-100">{crumb}</button></React.Fragment>; })}</div><p className="mt-1 text-xs font-semibold text-slate-500">{childFolders.length} 个文件夹 · {currentAssets.length} 个媒体资产</p></div>{activeFolder ? <Button variant="secondary" onClick={() => setActiveFolder(parentFolder(activeFolder))}><Icon name="chevron" />返回上一级</Button> : null}</div>
            <div className="min-h-[540px] px-7 py-8"><div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-x-10 gap-y-12">{childFolders.map((folder) => <button key={folder} type="button" onClick={() => setActiveFolder(folder)} className="group rounded-2xl px-2 py-3 text-center transition hover:bg-indigo-50/80"><FolderIconLarge /><div className="mt-4 line-clamp-2 text-[15px] font-black leading-5 text-slate-800 group-hover:text-indigo-600">{folderDisplayName(folder)}</div></button>)}{currentAssets.map((asset) => <article key={asset.id} className="group rounded-2xl px-2 py-3 text-center transition hover:bg-slate-50"><div className="mx-auto flex h-[86px] w-[132px] items-center justify-center rounded-2xl bg-slate-100 p-2 shadow-sm ring-1 ring-slate-200/70"><MediaPreview item={asset} className="h-full w-full rounded-xl" /></div><div className="mt-4 line-clamp-2 text-[15px] font-black leading-5 text-slate-800 group-hover:text-indigo-600">{asset.name}</div><div className="mt-1 text-xs font-semibold text-slate-400">{asset.mediaType === "image" ? "图片" : "视频"} · {asset.createdAt}</div></article>)}</div>{childFolders.length === 0 && currentAssets.length === 0 ? <div className="rounded-[24px] bg-slate-50 p-12 text-center text-sm font-semibold text-slate-400">当前文件夹中还没有内容</div> : null}</div>
          </main>
        </div>
      </div>
    </section>
  );
}

function ImagePreviewDialog({ item, onClose, onDownload }) {
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", handler);
    };
  }, [onClose]);
  if (!item) return null;
  const source = item.fileUrl || item.url || item.downloadUrl;
  return (
    <div onClick={onClose} className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/82 p-4 backdrop-blur-sm">
      <div onClick={(event) => event.stopPropagation()} className="relative max-h-[92vh] w-full max-w-[1120px] overflow-hidden rounded-[28px] bg-white shadow-[0_28px_90px_rgba(0,0,0,0.38)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0"><h3 className="truncate text-base font-black text-slate-950">{item.title || item.name || "图片预览"}</h3><p className="mt-1 truncate text-xs font-semibold text-slate-500">{item.prompt || item.sourceId || "点击空白处关闭"}</p></div>
          <div className="flex shrink-0 gap-2"><Button variant="secondary" onClick={() => onDownload(item)}><Icon name="download" />下载</Button><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Icon name="x" /></button></div>
        </div>
        <div className="flex max-h-[78vh] items-center justify-center overflow-auto bg-slate-950 p-4">
          {source ? <img src={source} alt={item.title || item.name || "图片预览"} className="max-h-[74vh] max-w-full rounded-2xl object-contain shadow-2xl" /> : <div className="p-12 text-sm font-bold text-white">没有可预览图片</div>}
        </div>
      </div>
    </div>
  );
}

function SaveAssetDialog({ item, folders, onClose, onConfirm, onCreateFolder }) {
  const [assetName, setAssetName] = useState(item?.title || "");
  const [selectedFolder, setSelectedFolder] = useState("未分类");
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const pickerRef = useRef(null);
  useEffect(() => { const old = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = old; }; }, []);
  useEffect(() => {
    if (!folderPickerOpen) return undefined;
    const handler = (event) => { if (!pickerRef.current?.contains(event.target)) setFolderPickerOpen(false); };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [folderPickerOpen]);
  if (!item) return null;
  function createFolderFromDialog() {
    const name = normalizeFolder(newFolder);
    if (!name) return;
    const next = normalizeFolder(selectedFolder ? `${selectedFolder}/${name}` : name);
    onCreateFolder(next);
    setSelectedFolder(next);
    setNewFolder("");
  }
  function save() { onConfirm(item, { name: assetName.trim() || item.title, folder: selectedFolder }); }
  return (
    <div onWheel={(e) => e.stopPropagation()} className="fixed inset-0 z-[80] grid place-items-center overflow-hidden bg-slate-950/35 p-5 backdrop-blur-sm">
      <div className="w-full max-w-[760px] overflow-visible rounded-[28px] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5"><div><h3 className="text-lg font-black text-slate-950">保存到资产库</h3><p className="mt-1 text-sm font-semibold text-slate-500">只保存生成的图片或视频本身，不保存提示词卡片。</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Icon name="x" /></button></div>
        <div className="grid gap-5 p-6 md:grid-cols-[240px_1fr]"><MediaPreview item={item} className="w-full rounded-2xl" /><div className="space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-black text-slate-500">资产名称</span><input value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="输入资产名称" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100" /></label><div ref={pickerRef} className="relative"><span className="mb-1.5 block text-xs font-black text-slate-500">保存到文件夹</span><button type="button" onClick={() => setFolderPickerOpen((open) => !open)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-800 outline-none hover:border-indigo-300"><span className="flex min-w-0 items-center gap-2"><Icon name="folder" /><span className="truncate">{selectedFolder || "资产库"}</span></span><Icon name="chevron" /></button>{folderPickerOpen ? <div onWheel={(e) => e.stopPropagation()} className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-black text-slate-400">选择文件夹</p><button type="button" onClick={() => setFolderPickerOpen(false)} className="text-xs font-black text-indigo-600">完成</button></div><FolderTree folders={folders} selectedFolder={selectedFolder} onSelect={setSelectedFolder} compact /></div> : null}</div><div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"><p className="mb-2 text-xs font-black text-slate-500">在所选文件夹下新建文件夹</p><div className="flex gap-2"><input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createFolderFromDialog(); }} placeholder="文件夹名称" className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-200 focus:ring-indigo-300" /><Button variant="soft" onClick={createFolderFromDialog} className="px-3"><Icon name="plus" /></Button></div></div></div></div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4"><Button variant="ghost" onClick={onClose} className="px-6 text-slate-500 hover:text-slate-800">取消</Button><Button onClick={save} className="px-10"><Icon name="check" />保存资产</Button></div>
      </div>
    </div>
  );
}

export default function App() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingItem, setGeneratingItem] = useState(null);
  const [activeSection, setActiveSection] = useState("create");
  const [activeFilter, setActiveFilter] = useState("all");
  const [project, setProject] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [mediaModels, setMediaModels] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [folders, setFolders] = useState(["未分类"]);
  const [activeFolder, setActiveFolder] = useState("未分类");
  const [assets, setAssets] = useState([]);
  const [uploadedAssets, setUploadedAssets] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [providers, setProviders] = useState([]);
  const [pendingSaveItem, setPendingSaveItem] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [theme, setTheme] = useState("glass");
  const [toast, setToast] = useState(null);
  const composerRef = useRef(null);

  const savedSourceIds = useMemo(() => new Set(assets.map((asset) => asset.sourceId)), [assets]);
  const stats = useMemo(() => [
    { label: "运行任务", value: String(jobs.filter((job) => job.status === "running").length) },
    { label: "历史记录", value: String(historyItems.length) },
    { label: "资产库", value: String(assets.length) },
  ], [assets.length, historyItems.length, jobs]);

  useEffect(() => { runSelfTests(); }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const workspace = await ensureOpenDesignWorkspace();
        if (!active) return;
        setProject(workspace.project);
        setConversation(workspace.conversation);
        await refreshWorkspace(workspace, active);
      } catch (error) {
        if (active) showToast(error instanceof Error ? error.message : "加载工作台失败");
      }
    })();
    return () => { active = false; };
  }, []);
  
  useEffect(() => { 
    if (!toast) return undefined; 
    const timer = setTimeout(() => setToast(null), 1800); 
    return () => clearTimeout(timer); 
  }, [toast]);
  
  function showToast(message) { setToast(message); }

  async function ensureOpenDesignWorkspace() {
    const data = await listProjects();
    const projects = data.projects || data || [];
    let nextProject = projects.find((item) => item.id === ILLUSORY_PROJECT_ID)
      || projects.find((item) => item.metadata?.kind === "media-workspace")
      || projects[0];
    let nextConversation = null;

    if (!nextProject) {
      const created = await createProject({
        id: ILLUSORY_PROJECT_ID,
        name: ILLUSORY_PROJECT_NAME,
        metadata: { kind: "media-workspace", source: "illusory-studio" },
      });
      nextProject = created.project;
      if (created.conversationId) nextConversation = { id: created.conversationId, projectId: nextProject.id, title: "默认创作会话" };
    }

    if (!nextConversation) {
      const convData = await listConversations(nextProject.id);
      nextConversation = (convData.conversations || [])[0];
    }

    if (!nextConversation) {
      const createdConv = await createConversation(nextProject.id, { title: "默认创作会话" });
      nextConversation = createdConv.conversation;
    }

    return { project: nextProject, conversation: nextConversation };
  }

  async function refreshWorkspace(workspace = { project, conversation }, active = true) {
    const projectId = workspace?.project?.id || project?.id || ILLUSORY_PROJECT_ID;
    const conversationId = workspace?.conversation?.id || conversation?.id;
    if (!conversationId) return;
    const [messageData, fileData, taskData, providerStatus, mediaModelRows] = await Promise.all([
      listMessages(projectId, conversationId),
      listProjectFiles(projectId),
      listProjectMediaTasks(projectId, { includeDone: true }),
      getProviders().catch(() => ({ providers: {} })),
      getMediaModels().catch(() => ({ image: [], video: [] })),
    ]);
    if (!active) return;
    const projectFiles = fileData.files || fileData || [];
    const allUploadedAssets = projectFiles.map((row) => openDesignFileFromApi(projectId, row));
    const nextHistoryItems = historyFromMessages(projectId, messageData.messages || []);
    const nextFolders = new Set(["未分类"]);
    assets.forEach((asset) => {
      let folder = asset.folder;
      while (folder) {
        nextFolders.add(folder);
        folder = parentFolder(folder);
      }
    });
    setHistoryItems((generatingItem ? [generatingItem, ...nextHistoryItems.filter((item) => item.id !== generatingItem.id)] : nextHistoryItems));
    setUploadedAssets(allUploadedAssets);
    setFolders(Array.from(nextFolders));
    setJobs(taskData.tasks || []);
    setProviders(normalizeProviderRows(providerStatus, mediaModelRows));
    setMediaModels(mediaModelRows);
  }

  function queueRefresh() {
    refreshWorkspace().catch((error) => showToast(error instanceof Error ? error.message : "刷新失败"));
  }

  function createFolder(folder) { const next = normalizeFolder(folder); if (!next) return; setFolders((current) => current.includes(next) ? current : [...current, next]); }
  async function confirmSaveAsset(item, options) {
    createFolder(options.folder);
    const savedAsset = {
      ...item,
      id: `asset-${item.id}`,
      sourceId: item.id,
      name: options.name,
      folder: normalizeFolder(options.folder || "未分类"),
      source: "来自 OpenDesign 生成文件",
    };
    setAssets((current) => current.some((asset) => asset.sourceId === item.id) ? current : [savedAsset, ...current]);
    setActiveFolder(options.folder);
    setPendingSaveItem(null);
    setActiveSection("assets");
    showToast("已保存到资产库");
  }
  async function waitForMediaTask(taskId) {
    let since = 0;
    for (;;) {
      const snapshot = await waitMediaTask(taskId, { since, timeoutMs: MEDIA_TASK_WAIT_TIMEOUT_MS });
      since = snapshot.nextSince ?? since;
      if (snapshot.status === "done") return snapshot;
      if (snapshot.status === "failed") throw new Error(snapshot.error?.message || "媒体生成失败");
    }
  }

  async function persistMediaMessage(payload, taskSnapshot) {
    const projectId = project?.id || ILLUSORY_PROJECT_ID;
    const conversationId = conversation?.id;
    if (!conversationId) return null;
    const taskId = taskSnapshot.taskId || payload.taskId;
    const message = {
      id: createMediaMessageId(taskId),
      role: "user",
      content: payload.prompt,
      createdAt: taskSnapshot.startedAt || Date.now(),
      endedAt: taskSnapshot.endedAt || Date.now(),
      runStatus: taskSnapshot.status === "done" ? "succeeded" : taskSnapshot.status,
      producedFiles: taskSnapshot.file ? [taskSnapshot.file] : [],
      model: payload.model,
      params: payload.params || {},
      metadata: {
        taskId,
        surface: payload.surface,
        model: payload.model,
        aspect: payload.aspect,
        params: payload.params || {},
      },
    };
    await putMessage(projectId, conversationId, message.id, message);
    return message;
  }

  async function generate(payload = null) {
    if (!payload) {
      openComposer();
      return;
    }
    setIsGenerating(true);
    const projectId = project?.id || ILLUSORY_PROJECT_ID;
    const output = payload.output || outputNameForPayload(payload);
    const request = { ...payload, output };
    const tempItem = {
      id: `generating-${Date.now()}`,
      sourceId: output,
      time: "生成中",
      title: request.surface === "video" ? "视频生成中" : "图片生成中",
      model: providerName(request.model),
      tags: tagsFromParams(request.params || {}),
      prompt: request.prompt || "",
      mediaType: request.surface === "video" ? "video" : "image",
      status: "generating",
      accent: "from-slate-950 via-indigo-800 to-cyan-500",
    };
    setActiveSection("create");
    setGeneratingItem(tempItem);
    setHistoryItems((current) => [tempItem, ...current.filter((item) => item.status !== "generating")]);
    try {
      const queued = await generateProjectMedia(projectId, request);
      const taskSnapshot = await waitForMediaTask(queued.taskId);
      await persistMediaMessage(request, taskSnapshot);
      setGeneratingItem(null);
      await refreshWorkspace();
      showToast("生成完成，结果已进入历史记录");
    } catch (error) {
      setGeneratingItem(null);
      setHistoryItems((current) => current.filter((item) => item.id !== tempItem.id));
      showToast(error instanceof Error ? error.message : "生成失败");
    } finally {
      setIsGenerating(false);
    }
  }
  function openComposer() { setActiveSection("create"); setTimeout(() => composerRef.current?.(), 0); }
  function editItem(item) {
    setEditDraft({ ...item, editNonce: Date.now() });
    openComposer();
    showToast(`已载入「${item.title}」原提示词，可直接继续编辑`);
  }
  function regenerateItem(item) {
    editItem(item);
    showToast(`已载入「${item.title}」参数，确认后可重新生成`);
  }
  async function downloadItem(item) {
    const source = item.downloadUrl || item.fileUrl || item.url;
    if (!source) {
      showToast("当前结果没有可下载文件");
      return;
    }
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const filename = (item.sourceId || item.name || item.meta?.filename || item.fileName || item.title || `silverloft-${Date.now()}`).toString().split("/").pop();
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename || `illusory-${Date.now()}`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      showToast(`已开始下载「${item.title}」`);
    } catch (error) {
      showToast(error instanceof Error ? `下载失败：${error.message}` : "下载失败");
    }
  }
  
  return (
    <main className={cn("min-h-screen bg-gradient-to-br text-slate-900", theme === "dark" ? "theme-dark from-slate-950 via-slate-900 to-indigo-950" : "from-[#f4f2ff] via-[#f8fbff] to-[#e0fbff]")}>
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className="lg:pl-[84px]">
        <Header APP_VERSION={APP_VERSION} setActiveSection={setActiveSection} onOpenComposer={openComposer} onNotify={() => showToast("暂无新通知")} />
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(117,95,255,.15),transparent_28%),radial-gradient(circle_at_90%_42%,rgba(57,220,235,.24),transparent_30%)]" />
        {toast ? <div className="fixed right-5 top-24 z-[90] rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl">{toast}</div> : null}
        
        {activeSection === "create" ? (
          <div className="relative mx-auto max-w-[1280px] px-5 pt-6 lg:px-10">
            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/60 bg-white/40 p-5 shadow-sm backdrop-blur-md">
                  <p className="text-xs font-black text-slate-500">{item.label}</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-indigo-600">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        
        {activeSection === "create" ? (
          <HistoryFeed historyItems={historyItems} activeFilter={activeFilter} setActiveFilter={setActiveFilter} onSaveAsset={setPendingSaveItem} savedSourceIds={savedSourceIds} onEdit={editItem} onRegenerate={regenerateItem} onDownload={downloadItem} onPreview={setPreviewItem} />
        ) : activeSection === "explore" ? (
          <ExplorePage setActiveSection={setActiveSection} />
        ) : activeSection === "tasks" ? (
          <PlaceholderPage title="任务" description="这里后续可以展示生成队列、批量任务、失败重试和定时任务。" />
        ) : activeSection === "tools" ? (
          <ToolsPage />
        ) : activeSection === "assets" ? (
          <AssetLibrary assets={assets} folders={folders} activeFolder={activeFolder} setActiveFolder={setActiveFolder} onCreateFolder={createFolder} setActiveSection={setActiveSection} />
        ) : activeSection === "settings" ? (
          <SettingsPage providers={providers} />
        ) : activeSection === "profile" ? (
          <ProfilePage theme={theme} setTheme={setTheme} />
        ) : (
          <PlaceholderPage title="模块开发中" description="该功能正在逐步上线，敬请期待。" />
        )}
        
        {activeSection === "create" ? <ComposerDock onGenerate={generate} registerOpen={(fn) => { composerRef.current = fn; }} projectId={project?.id || ILLUSORY_PROJECT_ID} conversationId={conversation?.id || "conv_default"} assets={uploadedAssets} providers={providers} mediaModels={mediaModels} editDraft={editDraft} onEditDraftApplied={() => setEditDraft(null)} onUploaded={queueRefresh} /> : null}
      </div>
      
      {pendingSaveItem ? <SaveAssetDialog item={pendingSaveItem} folders={folders} onClose={() => setPendingSaveItem(null)} onConfirm={confirmSaveAsset} onCreateFolder={createFolder} /> : null}
      {previewItem ? <ImagePreviewDialog item={previewItem} onClose={() => setPreviewItem(null)} onDownload={downloadItem} /> : null}
      
    </main>
  );
}
