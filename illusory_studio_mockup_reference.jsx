import React, { useEffect, useMemo, useRef, useState } from "react";

const APP_VERSION = "v1.2.8"

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Icon({ name, size = 18, className = "" }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: cn("shrink-0", className),
    "aria-hidden": "true",
  };

  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    sparkles: <><path d="M12 3 9.8 9.8 3 12l6.8 2.2L12 21l2.2-6.8L21 12l-6.8-2.2L12 3Z" /><path d="M5 3v4" /><path d="M3 5h4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    archive: <><rect x="3" y="4" width="18" height="4" rx="1.5" /><path d="M5 8v11a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8" /><path d="M10 12h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20h-3v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1A1.7 1.7 0 0 0 7 14.5a1.7 1.7 0 0 0-1.6-1H5v-3h.4A1.7 1.7 0 0 0 7 9.5a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1A1.7 1.7 0 0 0 10.7 6a1.7 1.7 0 0 0 1-1.6V4h3v.4a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.6 1h.4v3H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    folder: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" /><path d="M3 10h18" /></>,
    play: <path d="m8 5 11 7-11 7V5Z" />,
    image: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="8" cy="10" r="1.7" /><path d="m21 16-5-5L5 19" /></>,
    video: <><rect x="3" y="6" width="14" height="12" rx="2.5" /><path d="m17 10 4-3v10l-4-3" /></>,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></>,
    x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    more: <><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" /></>,
    refresh: <><path d="M21 12a9 9 0 0 1-15.5 6.2" /><path d="M3 12A9 9 0 0 1 18.5 5.8" /><path d="M18 2v4h-4" /><path d="M6 22v-4h4" /></>,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
  };

  return <svg {...common}>{paths[name] || paths.sparkles}</svg>;
}

function Button({ children, className = "", variant = "primary", ...props }) {
  const styles = {
    primary: "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200 hover:shadow-indigo-300",
    secondary: "border border-slate-200 bg-white/90 text-slate-800 hover:border-indigo-200 hover:bg-indigo-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    soft: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
  };
  return (
    <button type="button" {...props} className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] leading-5 font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70", styles[variant], className)}>
      {children}
    </button>
  );
}

const INITIAL_HISTORY_ITEMS = [
  {
    id: 1,
    time: "04-28 17:01",
    title: "第一人称氛围视频",
    model: "Doubao-Seedance-2.0",
    tags: ["参考生成", "720p", "9:16", "13秒", "2条", "声音"],
    prompt: "第一人称视角，我坐在昏暗房间的低矮沙发上，镜头高度较低，略微仰视。房间里有暖色落地灯、桌面小夜灯和红紫色氛围灯，背景柔和虚化。人物从对面缓慢走向镜头，步伐轻柔自然，眼神一直看着镜头，表情甜美、微笑，带一点调皮的掌控感。",
    mediaType: "video",
    accent: "from-zinc-950 via-zinc-900 to-black",
  },
  {
    id: 2,
    time: "今天 14:20",
    title: "直播间商业封面",
    model: "GPT Image 2",
    tags: ["图片生成", "9:16", "2K", "商业封面"],
    prompt: "参考 @图片1 的人物身份，结合 @模板1 的直播封面结构，生成 9:16 商业视觉图。画面需要高级、干净、有强点击欲，适合电商直播间使用。",
    mediaType: "image",
    accent: "from-cyan-400 via-sky-500 to-indigo-600",
  },
  {
    id: 3,
    time: "昨天 19:12",
    title: "新品发布主视觉",
    model: "Visual Pro",
    tags: ["品牌 KV", "4:5", "高清"],
    prompt: "生成一张新品发布主视觉，浅色高级背景，中心产品高光突出，适合小红书和信息流广告投放。",
    mediaType: "image",
    accent: "from-amber-300 via-orange-400 to-pink-500",
  },
];

const INITIAL_FOLDERS = ["未分类", "直播电商/封面图", "直播电商/主播封面", "品牌营销/主视觉", "视频素材/氛围短片"];

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

function makeAssetFromHistory(item, options = {}) {
  return {
    id: options.id || `asset-${item.id}-${Date.now()}`,
    sourceId: item.id,
    name: options.name || item.title,
    mediaType: item.mediaType,
    folder: normalizeFolder(options.folder || "未分类"),
    source: options.source || "来自历史生成结果",
    accent: item.accent,
    createdAt: options.createdAt || "刚刚保存",
  };
}

function runSelfTests() {
  const folders = ["A/B", "A/C", "D", "A/B/E"];
  console.assert(normalizeFolder("/A//B/") === "A/B", "normalizeFolder cleans slashes");
  console.assert(parentFolder("A/B/C") === "A/B", "parentFolder returns parent");
  console.assert(getDirectChildFolders(folders, "").join("|") === "A|D", "root children are direct");
  console.assert(getDirectChildFolders(folders, "A").join("|") === "A/B|A/C", "nested children are direct");
  console.assert(folderDisplayName("直播电商/封面图") === "封面图", "folderDisplayName returns leaf");
}

const INITIAL_ASSETS = [
  makeAssetFromHistory(INITIAL_HISTORY_ITEMS[1], {
    id: "asset-demo-1",
    name: "直播间商业封面 01",
    folder: "直播电商/封面图",
    source: "来自创作保存",
    createdAt: "今天 14:20",
  }),
];

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

function Sidebar({ activeSection, setActiveSection }) {
  const navItems = [
    { key: "explore", label: "探索", icon: "search" },
    { key: "create", label: "创作", icon: "sparkles" },
    { key: "tasks", label: "任务", icon: "clock" },
    { key: "assets", label: "资产", icon: "archive" },
    { key: "settings", label: "设置", icon: "settings" },
  ];
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[84px] flex-col items-center bg-white/70 py-5 backdrop-blur-xl lg:flex">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-black text-white shadow-lg shadow-indigo-200">IS</div>
      <nav className="mt-12 flex flex-1 flex-col gap-5">
        {navItems.map((item) => (
          <button key={item.key} type="button" onClick={() => setActiveSection(item.key)} className={cn("group flex flex-col items-center gap-1 rounded-2xl px-3 py-3 text-xs font-medium transition", activeSection === item.key ? "bg-indigo-100 text-indigo-600" : "text-slate-500 hover:bg-white hover:text-slate-900")}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <button type="button" onClick={() => setActiveSection("profile")} className={cn("mb-1 flex flex-col items-center gap-2 rounded-2xl px-3 py-3 transition", activeSection === "profile" ? "bg-indigo-100 text-indigo-600" : "text-slate-500 hover:bg-white hover:text-slate-900")}>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-slate-800 to-indigo-500 text-[13px] font-black text-white shadow-md">U</span>
        <span className="text-[11px] leading-3 font-bold">我的</span>
      </button>
    </aside>
  );
}

function Header({ setActiveSection, onOpenComposer, onNotify }) {
  return (
    <header className="sticky top-0 z-30 bg-white/45 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-[1680px] items-center justify-between px-5 lg:px-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="lg:hidden"><Icon name="menu" /></Button>
          <div>
            <h1 className="text-[22px] leading-7 font-black tracking-tight text-slate-950">Illusory Studio</h1>
            <p className="text-[12px] leading-4 font-medium text-slate-500">AI 商业视觉创作工作台</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500">{APP_VERSION}</span>
          <Button variant="secondary" className="hidden sm:inline-flex" onClick={onNotify}><Icon name="bell" />通知</Button>
          <Button onClick={() => { setActiveSection("create"); onOpenComposer?.(); }}><Icon name="plus" />新建项目</Button>
        </div>
      </div>
    </header>
  );
}

function SelectPill({ id, value, options, onChange, openId, setOpenId }) {
  const open = openId === id;
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpenId(open ? null : id)} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">
        {value}<Icon name="chevron" />
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {options.map((item) => (
            <button key={item} type="button" onClick={() => { onChange(item); setOpenId(null); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50">
              {item}{item === value ? <Icon name="check" className="text-indigo-600" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MediaPreview({ item, className = "" }) {
  return (
    <div className={cn("relative aspect-[16/9] overflow-hidden rounded-sm bg-black shadow-inner", className)}>
      <div className={cn("absolute left-1/2 top-0 h-full w-[38%] -translate-x-1/2 bg-gradient-to-br", item.accent)} />
      <div className="absolute left-[46%] top-[22%] h-44 w-24 rounded-full bg-white/10 blur-xl" />
      <div className="absolute left-3 top-3 rounded bg-black/80 px-2 py-1 text-xs font-black text-white">{item.mediaType === "video" ? "视频" : "图片"}</div>
      {item.mediaType === "video" ? (
        <div className="absolute inset-0 grid place-items-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-white/85 text-slate-950 shadow-xl"><Icon name="play" /></div>
        </div>
      ) : null}
    </div>
  );
}

function HistoryItem({ item, onSaveAsset, isSaved, onEdit, onRegenerate, onDownload }) {
  return (
    <article className="rounded-[22px] bg-white/70 p-5 shadow-[0_16px_55px_rgba(77,92,151,0.08)] ring-1 ring-white/80 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span className="font-semibold">{item.time}</span>
        <Button variant="ghost" className="px-2 py-1"><Icon name="more" /></Button>
      </div>
      <p className="max-w-[1180px] text-[15px] font-medium leading-8 text-slate-800">{item.prompt} <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 font-bold text-indigo-600">@图片1</span></p>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.tags.map((tag) => <span key={tag} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">{tag}</span>)}
        <span className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{item.model}</span>
      </div>
      <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end">
        <MediaPreview item={item} className="w-full max-w-[620px]" />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => onEdit(item)}><Icon name="edit" />编辑</Button>
          <Button variant="secondary" onClick={() => onRegenerate(item)}><Icon name="refresh" />重新生成</Button>
          <Button variant="secondary" onClick={() => onDownload(item)}><Icon name="download" />下载</Button>
          <Button variant={isSaved ? "secondary" : "soft"} disabled={isSaved} onClick={() => onSaveAsset(item)}>
            <Icon name={isSaved ? "check" : "archive"} />{isSaved ? "已保存资产库" : "保存到资产库"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function HistoryFeed({ historyItems, activeFilter, setActiveFilter, onSaveAsset, savedSourceIds, onEdit, onRegenerate, onDownload }) {
  const filtered = activeFilter === "all" ? historyItems : historyItems.filter((item) => item.mediaType === activeFilter);
  const tabs = [{ key: "all", label: "全部" }, { key: "image", label: "图片" }, { key: "video", label: "视频" }];
  return (
    <section className="mx-auto max-w-[1280px] px-5 pb-48 pt-6 lg:px-10">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-[20px] leading-7 font-black text-slate-950">历史生成记录</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">查看以往提示词、生成参数和结果，可继续编辑、筛选或保存为资产。</p>
        </div>
        <div className="hidden items-center gap-2 rounded-2xl bg-white/70 p-1 shadow-sm md:flex">
          {tabs.map((tab) => (
            <button key={tab.key} type="button" aria-label={`筛选${tab.label}`} onClick={() => setActiveFilter(tab.key)} className={cn("rounded-xl px-5 py-2.5 text-sm font-bold transition", activeFilter === tab.key ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900")}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-5">{filtered.map((item) => <HistoryItem key={item.id} item={item} onSaveAsset={onSaveAsset} isSaved={savedSourceIds.has(item.id)} onEdit={onEdit} onRegenerate={onRegenerate} onDownload={onDownload} />)}</div>
      {filtered.length === 0 ? <div className="rounded-[22px] bg-white/70 p-12 text-center text-sm font-semibold text-slate-400 ring-1 ring-white/80">暂无对应类型的历史记录</div> : null}
    </section>
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
        <div className="grid gap-5 p-6 md:grid-cols-[240px_1fr]"><MediaPreview item={item} className="w-full rounded-2xl" /><div className="space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-black text-slate-500">资产名称</span><input value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="输入资产名称" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100" /></label><div ref={pickerRef} className="relative"><span className="mb-1.5 block text-xs font-black text-slate-500">保存到文件夹</span><button type="button" onClick={() => setFolderPickerOpen((open) => !open)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-800 outline-none hover:border-indigo-300"><span className="flex min-w-0 items-center gap-2"><Icon name="folder" /><span className="truncate">{selectedFolder || "资产库"}</span></span><Icon name="chevron" /></button>{folderPickerOpen ? <div onWheel={(e) => e.stopPropagation()} className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-black text-slate-400">选择文件夹</p><button type="button" onClick={() => setFolderPickerOpen(false)} className="text-xs font-black text-indigo-600">完成</button></div><FolderTree folders={folders} selectedFolder={selectedFolder} onSelect={setSelectedFolder} compact /></div> : null}</div><div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"><p className="mb-2 text-xs font-black text-slate-500">在所选文件夹下新建文件夹</p><div className="flex gap-2"><input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createFolderFromDialog(); }} placeholder="文件夹名称" className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-indigo-200" /><Button variant="soft" onClick={createFolderFromDialog}><Icon name="plus" />新建</Button></div></div><div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onClose}>取消</Button><Button onClick={save}><Icon name="archive" />保存资产</Button></div></div></div>
      </div>
    </div>
  );
}

function ComposerDock({ onGenerate, registerOpen }) {
  const config = {
    image: {
      uploadLabel: "图片 / 模板",
      models: ["GPT Image 2", "Visual Pro", "Studio Render"],
      aspects: ["9:16", "1:1", "16:9", "4:5"],
      qualities: ["2K", "4K", "高清"],
      placeholder: "参考 @图片1 的人物身份，结合 @模板1 的直播封面结构，生成 9:16 商业视觉图。",
    },
    video: {
      uploadLabel: "图片 / 视频 / 音频",
      models: ["Doubao-Seedance-2.0", "Video Pro", "Motion Studio"],
      aspects: ["9:16", "16:9", "1:1"],
      qualities: ["720p", "1080p", "2K"],
      durations: ["5秒", "8秒", "13秒", "20秒"],
      audio: ["声音", "静音", "音画同步"],
      placeholder: "第一人称视角……描述镜头运动、人物动作、氛围、声音和结尾动作。",
    },
  };

  const rootRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [type, setType] = useState("image");
  const [model, setModel] = useState(config.image.models[0]);
  const [aspect, setAspect] = useState("9:16");
  const [quality, setQuality] = useState("2K");
  const [duration, setDuration] = useState("13秒");
  const [audio, setAudio] = useState("音画同步");
  const [prompt, setPrompt] = useState("");
  const [openSelectId, setOpenSelectId] = useState(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [uploadedAssets, setUploadedAssets] = useState([]);
  const current = config[type];

  useEffect(() => {
    registerOpen?.(() => {
      setExpanded(true);
      requestAnimationFrame(() => textareaRef.current?.focus());
    });
    return () => registerOpen?.(null);
  }, [registerOpen]);

  const builtInAssets = [
    { id: "builtin-image-1", label: "@图片1", keyword: "图片1", type: "人物参考", mediaType: "image", color: "from-zinc-900 to-slate-500" },
    { id: "builtin-template-1", label: "@模板1", keyword: "模板1", type: "直播封面", mediaType: "image", color: "from-cyan-400 to-indigo-500" },
    { id: "builtin-audio-1", label: "@音频1", keyword: "音频1", type: "声音素材", mediaType: "audio", color: "from-emerald-300 to-teal-500" },
  ];
  const mentionAssets = [...uploadedAssets, ...builtInAssets];
  const filteredAssets = mentionQuery === null
    ? []
    : mentionAssets.filter((asset) => asset.keyword.startsWith(mentionQuery) || asset.label.startsWith(`@${mentionQuery}`));

  function getFileKind(file) {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "file";
  }

  function getUploadPrefix(kind) {
    if (kind === "image") return "图片";
    if (kind === "video") return "视频";
    if (kind === "audio") return "音频";
    return "文件";
  }

  async function handleUploadFiles(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setExpanded(true);
    setOpenSelectId(null);

    for (const file of files) {
      const kind = getFileKind(file);
      const prefix = getUploadPrefix(kind);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", kind);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`上传失败：${response.status}`);
        }

        const payload = await response.json();
        const data = payload.data || payload;
        const fileUrl = data.fileUrl || data.url || data.path;
        const thumbnailUrl = data.thumbnailUrl || data.thumbUrl || fileUrl;

        setUploadedAssets((currentAssets) => {
          const sameTypeCount = currentAssets.filter((asset) => asset.mediaType === kind).length;
          const index = sameTypeCount + 2;
          const label = `@${prefix}${index}`;

          return [{
            id: data.id || `upload-${Date.now()}-${file.name}`,
            label,
            keyword: `${prefix}${index}`,
            type: file.name,
            mediaType: kind,
            fileName: file.name,
            fileSize: data.fileSize || data.size || file.size,
            fileUrl,
            thumbnailUrl,
            previewUrl: thumbnailUrl,
            uploaded: true,
            color: kind === "image" ? "from-sky-400 to-indigo-500" : kind === "video" ? "from-violet-500 to-fuchsia-500" : "from-emerald-300 to-teal-500",
          }, ...currentAssets];
        });
      } catch (error) {
        setUploadedAssets((currentAssets) => [{
          id: `upload-error-${Date.now()}-${file.name}`,
          label: `@${prefix}上传失败`,
          keyword: `${prefix}上传失败`,
          type: error instanceof Error ? error.message : "上传失败",
          mediaType: kind,
          fileName: file.name,
          fileSize: file.size,
          uploadError: true,
          color: "from-rose-400 to-red-500",
        }, ...currentAssets]);
      }
    }

    event.target.value = "";
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function removeUploadedAsset(id) {
    setUploadedAssets((assets) => {
      const target = assets.find((asset) => asset.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return assets.filter((asset) => asset.id !== id);
    });
  }

  function getMentionInfo(value, caret) {
    const before = value.slice(0, caret);
    const match = before.match(/(^| )@([^ @]*)$/);
    if (!match) return null;
    return { query: match[2] || "", start: before.lastIndexOf("@"), end: caret };
  }

  function handlePromptChange(event) {
    const value = event.target.value;
    const info = getMentionInfo(value, event.target.selectionStart || value.length);
    setPrompt(value);
    setMentionQuery(info ? info.query : null);
    setSelectedMentionIndex(0);
  }

  function insertMention(label) {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? prompt.length;
    const info = getMentionInfo(prompt, caret);
    const start = info ? info.start : prompt.lastIndexOf("@");
    const end = info ? info.end : caret;
    const next = start >= 0 ? prompt.slice(0, start) + label + " " + prompt.slice(end) : prompt + label + " ";
    const nextCaret = (start >= 0 ? start : prompt.length) + label.length + 1;
    setPrompt(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function handlePromptKeyDown(event) {
    if (mentionQuery === null || filteredAssets.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedMentionIndex((index) => (index + 1) % filteredAssets.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedMentionIndex((index) => (index - 1 + filteredAssets.length) % filteredAssets.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      insertMention(filteredAssets[selectedMentionIndex].label);
    } else if (event.key === "Escape") {
      setMentionQuery(null);
    }
  }

  function switchType(nextType) {
    setType(nextType);
    setModel(config[nextType].models[0]);
    setQuality(nextType === "image" ? "2K" : "720p");
    setAspect("9:16");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function onLeave(event) {
    if (!rootRef.current?.contains(event.relatedTarget)) {
      setExpanded(false);
      setOpenSelectId(null);
      setMentionQuery(null);
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none lg:left-[84px]">
      <div className="mx-auto max-w-[920px] px-4 pb-5 pointer-events-auto">
        <section ref={rootRef} onMouseLeave={onLeave} className={cn("overflow-visible rounded-[24px] border border-white/80 bg-white/90 shadow-[0_18px_70px_rgba(77,92,151,0.22)] backdrop-blur-2xl transition-all duration-300", expanded ? "p-5" : "p-3")}>
          <input id="composer-file-upload" ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*" onChange={handleUploadFiles} className="absolute h-px w-px opacity-0" />
          {!expanded ? (
            <div className="flex items-center gap-3">
              <label htmlFor="composer-file-upload" className="inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-indigo-50 px-0 text-[14px] leading-5 font-semibold text-indigo-600 transition hover:bg-indigo-100 active:scale-[0.98]"><Icon name="plus" /></label>
              <button type="button" onClick={() => setExpanded(true)} className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-500 hover:bg-slate-100">
                {type === "image" ? "图片制作：使用 @ 引用素材或模板..." : "视频创作：描述镜头、动作、秒数和声音..."}
              </button>
              <Button onClick={() => { setExpanded(true); onGenerate(); }} className="h-12 w-12 rounded-2xl px-0"><Icon name="upload" /></Button>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-950">创作指令 <span className="ml-2 rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-600">{APP_VERSION}</span></h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">上传图片、视频或音频后，可在输入框里用 @ 快速引用。</p>
                </div>
                <button type="button" onClick={() => setExpanded(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Icon name="x" /></button>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
                {["image", "video"].map((item) => (
                  <button key={item} type="button" onClick={() => switchType(item)} className={cn("flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition", type === item ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
                    <Icon name={item === "image" ? "image" : "play"} />{item === "image" ? "图片制作" : "视频创作"}
                  </button>
                ))}
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <label htmlFor="composer-file-upload" className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-[14px] leading-5 font-semibold text-indigo-600 transition hover:bg-indigo-100 active:scale-[0.98]"><Icon name="upload" />上传{current.uploadLabel}</label>
                {uploadedAssets.slice(0, 5).map((asset) => (
                  <Button key={asset.id} variant="soft" onClick={() => insertMention(asset.label)}>
                    {asset.label} <span className="max-w-[88px] truncate text-[11px] opacity-70">{asset.fileName}</span>
                    <span onClick={(event) => { event.stopPropagation(); removeUploadedAsset(asset.id); }}><Icon name="x" /></span>
                  </Button>
                ))}
                {uploadedAssets.length === 0 ? <><Button variant="soft">@图片1 <Icon name="x" /></Button>{type === "video" ? <Button variant="soft">@音频1 <Icon name="x" /></Button> : <Button variant="soft">@模板1 <Icon name="x" /></Button>}</> : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100">
                <div className="relative">
                  <textarea ref={textareaRef} autoFocus value={prompt} onChange={handlePromptChange} onKeyDown={handlePromptKeyDown} onFocus={(event) => { setOpenSelectId(null); const info = getMentionInfo(event.currentTarget.value, event.currentTarget.selectionStart || event.currentTarget.value.length); setMentionQuery(info ? info.query : null); }} className="min-h-[132px] w-full resize-none bg-transparent text-[15px] font-medium leading-7 text-slate-700 outline-none placeholder:text-slate-400" placeholder={current.placeholder} />
                  {mentionQuery !== null ? (
                    <div className="absolute left-0 top-9 z-40 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                      <div className="border-b border-slate-100 px-3 py-2 text-xs font-bold text-slate-400">选择引用素材</div>
                      {filteredAssets.length > 0 ? filteredAssets.map((asset, index) => (
                        <button key={asset.id || asset.label} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insertMention(asset.label)} onMouseEnter={() => setSelectedMentionIndex(index)} className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-indigo-50", index === selectedMentionIndex && "bg-indigo-50")}>
                          {asset.previewUrl && asset.mediaType === "image" ? <img src={asset.previewUrl} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <span className={cn("grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white", asset.color)}><Icon name={asset.mediaType === "video" ? "play" : asset.mediaType === "audio" ? "video" : "image"} /></span>}
                          <span className="min-w-0"><span className="block text-sm font-black text-indigo-600">{asset.label}</span><span className="block truncate text-xs font-semibold text-slate-500">{asset.type}</span></span>
                        </button>
                      )) : <div className="px-3 py-4 text-sm font-semibold text-slate-400">没有匹配的素材</div>}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-xs font-semibold text-slate-400">{prompt.length}/1200</span><Button variant="ghost" className="text-indigo-600"><Icon name="sparkles" />优化提示词</Button></div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <SelectPill id="model" value={model} options={current.models} onChange={setModel} openId={openSelectId} setOpenId={setOpenSelectId} />
                  <SelectPill id="aspect" value={aspect} options={current.aspects} onChange={setAspect} openId={openSelectId} setOpenId={setOpenSelectId} />
                  <SelectPill id="quality" value={quality} options={current.qualities} onChange={setQuality} openId={openSelectId} setOpenId={setOpenSelectId} />
                  {type === "video" ? <SelectPill id="duration" value={duration} options={current.durations} onChange={setDuration} openId={openSelectId} setOpenId={setOpenSelectId} /> : null}
                  {type === "video" ? <SelectPill id="audio" value={audio} options={current.audio} onChange={setAudio} openId={openSelectId} setOpenId={setOpenSelectId} /> : null}
                </div>
                <Button onClick={onGenerate} className={cn("px-8", !prompt.trim() && "opacity-90")}><Icon name="upload" />{type === "image" ? "生成图片" : "生成视频"}</Button>
              </div>
            </div>
          )}
        </section>
        <div className="mt-3 hidden justify-center gap-8 text-xs font-medium text-slate-400 sm:flex"><span>{APP_VERSION}</span><span>试用体验内容均由人工智能模型生成</span><span>免责声明</span><span>测试协议</span><span>隐私政策</span></div>
      </div>
    </div>
  );
}

export default function IllusoryStudioMockup({ onRegisterComposerOpen }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState("create");
  const [activeFilter, setActiveFilter] = useState("all");
  const [folders, setFolders] = useState(INITIAL_FOLDERS);
  const [activeFolder, setActiveFolder] = useState("直播电商/封面图");
  const [assets, setAssets] = useState(INITIAL_ASSETS);
  const [pendingSaveItem, setPendingSaveItem] = useState(null);
  const [theme, setTheme] = useState("glass");
  const [toast, setToast] = useState(null);
  const savedSourceIds = useMemo(() => new Set(assets.map((asset) => asset.sourceId)), [assets]);
  const stats = useMemo(() => [{ label: "今日生成", value: "18" }, { label: "历史记录", value: String(INITIAL_HISTORY_ITEMS.length) }, { label: "资产库", value: String(assets.length) }], [assets.length]);
  useEffect(() => { runSelfTests(); }, []);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(null), 1800); return () => clearTimeout(timer); }, [toast]);
  function showToast(message) { setToast(message); }
  function createFolder(folder) { const next = normalizeFolder(folder); if (!next) return; setFolders((current) => current.includes(next) ? current : [...current, next]); }
  function confirmSaveAsset(item, options) { createFolder(options.folder); setAssets((current) => current.some((asset) => asset.sourceId === item.id) ? current : [makeAssetFromHistory(item, options), ...current]); setActiveFolder(options.folder); setPendingSaveItem(null); setActiveSection("assets"); showToast("已保存到资产库"); }
  function generate() { setIsGenerating(true); setTimeout(() => setIsGenerating(false), 1400); }
  function openComposer() { setActiveSection("create"); setTimeout(() => window.__ILLUSORY_OPEN_COMPOSER__?.(), 0); }
  function editItem(item) { openComposer(); showToast(`已载入「${item.title}」继续编辑`); }
  function regenerateItem(item) { setActiveSection("create"); generate(); showToast(`正在重新生成「${item.title}」`); }
  function downloadItem(item) { showToast(`已准备下载「${item.title}」`); }
  return (
    <main className={cn("min-h-screen bg-gradient-to-br text-slate-900", theme === "dark" ? "theme-dark from-slate-950 via-slate-900 to-indigo-950" : "from-[#f4f2ff] via-[#f8fbff] to-[#e0fbff]")}><style>{`.theme-dark [class*="bg-white"]{background-color:rgba(15,23,42,.78)!important}.theme-dark [class*="bg-slate-50"]{background-color:rgba(30,41,59,.72)!important}.theme-dark [class*="text-slate-950"],.theme-dark [class*="text-slate-900"],.theme-dark [class*="text-slate-800"]{color:#f8fafc!important}.theme-dark [class*="text-slate-600"],.theme-dark [class*="text-slate-500"]{color:#cbd5e1!important}.theme-dark [class*="text-slate-400"]{color:#94a3b8!important}.theme-dark [class*="border-slate-200"],.theme-dark [class*="border-white"],.theme-dark [class*="ring-white"]{border-color:rgba(148,163,184,.22)!important;--tw-ring-color:rgba(148,163,184,.2)!important}.theme-dark [class*="shadow-"]{box-shadow:0 18px 60px rgba(0,0,0,.28)!important}.theme-dark input,.theme-dark textarea,.theme-dark select{background-color:rgba(15,23,42,.78)!important;color:#f8fafc!important;border-color:rgba(148,163,184,.28)!important}.theme-dark .backdrop-blur-xl,.theme-dark .backdrop-blur-2xl{backdrop-filter:blur(20px)}`}</style><Sidebar activeSection={activeSection} setActiveSection={setActiveSection} /><div className="lg:pl-[84px]"><Header setActiveSection={setActiveSection} onOpenComposer={openComposer} onNotify={() => showToast("暂无新通知")} /><div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(117,95,255,.15),transparent_28%),radial-gradient(circle_at_90%_42%,rgba(57,220,235,.24),transparent_30%)]" />{toast ? <div className="fixed right-5 top-24 z-[90] rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl">{toast}</div> : null}{activeSection === "create" ? <div className="relative mx-auto max-w-[1280px] px-5 pt-6 lg:px-10"><div className="grid gap-3 sm:grid-cols-3">{stats.map((item) => <div key={item.label} className="rounded-3xl border border-white/70 bg-white/55 p-4 backdrop-blur-xl"><p className="text-xs font-bold text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p></div>)}</div>{isGenerating ? <div className="mt-4 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200"><Icon name="refresh" className="mr-2 inline animate-spin" />正在生成，完成后会自动出现在历史记录顶部。</div> : null}</div> : null}{activeSection === "assets" ? <AssetLibrary assets={assets} folders={folders} activeFolder={activeFolder} setActiveFolder={setActiveFolder} onCreateFolder={createFolder} setActiveSection={setActiveSection} /> : activeSection === "explore" ? <ExplorePage setActiveSection={setActiveSection} /> : activeSection === "tasks" ? <PlaceholderPage title="任务" description="这里后续可以展示生成队列、批量任务、失败重试和定时任务。" /> : activeSection === "settings" ? <SettingsPage /> : activeSection === "profile" ? <ProfilePage theme={theme} setTheme={setTheme} /> : <HistoryFeed historyItems={INITIAL_HISTORY_ITEMS} activeFilter={activeFilter} setActiveFilter={setActiveFilter} onSaveAsset={setPendingSaveItem} savedSourceIds={savedSourceIds} onEdit={editItem} onRegenerate={regenerateItem} onDownload={downloadItem} />}{activeSection === "create" ? <ComposerDock onGenerate={generate} registerOpen={onRegisterComposerOpen} /> : null}{pendingSaveItem ? <SaveAssetDialog item={pendingSaveItem} folders={folders} onClose={() => setPendingSaveItem(null)} onConfirm={confirmSaveAsset} onCreateFolder={createFolder} /> : null}</div></main>
  );
}
