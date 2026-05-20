import React from "react";
import { Icon, cn } from "./Icon";
import { Button } from "./Button";

export function MediaPreview({ item, className = "", onPreview }) {
  const source = item.fileUrl || item.url;
  const accent = item.accent || "from-slate-900 via-indigo-700 to-sky-500";
  const canPreview = Boolean(source) && item.mediaType === "image" && item.status !== "generating";
  return (
    <button
      type="button"
      disabled={!canPreview}
      onClick={() => canPreview && onPreview?.(item)}
      className={cn("relative block aspect-[16/9] overflow-hidden rounded-sm bg-black text-left shadow-inner", canPreview && "cursor-zoom-in focus:outline-none focus:ring-4 focus:ring-indigo-200", !canPreview && "cursor-default", className)}
    >
      {source && item.mediaType === "image" ? <img src={source} alt={item.name || item.title || "生成结果"} className="absolute inset-0 h-full w-full object-cover" /> : <div className={cn("absolute left-1/2 top-0 h-full w-[38%] -translate-x-1/2 bg-gradient-to-br", accent)} />}
      {!source ? <div className="absolute left-[46%] top-[22%] h-44 w-24 rounded-full bg-white/10 blur-xl" /> : null}
      <div className="absolute left-3 top-3 rounded bg-black/80 px-2 py-1 text-xs font-black text-white">{item.mediaType === "video" ? "视频" : "图片"}</div>
      {canPreview ? <div className="absolute right-3 top-3 rounded bg-white/90 px-2 py-1 text-xs font-black text-slate-700 opacity-0 shadow-sm transition group-hover:opacity-100">点击预览</div> : null}
      {item.status === "generating" ? (
        <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[1px]">
          <div className="flex flex-col items-center rounded-3xl bg-white/92 px-8 py-7 text-center shadow-2xl ring-1 ring-white/70 backdrop-blur-xl">
            <div className="relative mb-4 h-14 w-14">
              <div className="absolute inset-0 animate-ping rounded-full border-4 border-indigo-200" />
              <div className="absolute inset-2 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
            <h3 className="text-base font-black text-slate-900">正在生成...</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">结果会出现在这个人物卡片里</p>
          </div>
        </div>
      ) : null}
      {item.mediaType === "video" ? (
        <div className="absolute inset-0 grid place-items-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-white/85 text-slate-950 shadow-xl"><Icon name="play" /></div>
        </div>
      ) : null}
    </button>
  );
}

export function HistoryItem({ item, onSaveAsset, isSaved, onEdit, onRegenerate, onDownload, onPreview }) {
  const isGenerating = item.status === "generating";
  return (
    <article className="rounded-[22px] bg-white/70 p-5 shadow-[0_16px_55px_rgba(77,92,151,0.08)] ring-1 ring-white/80 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span className="font-semibold">{item.time}</span>
        <Button variant="ghost" className="px-2 py-1"><Icon name="more" /></Button>
      </div>
      <p className="max-w-[1180px] text-[15px] font-medium leading-8 text-slate-800">
        {item.prompt}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(item.tags || []).map((tag) => <span key={tag} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">{tag}</span>)}
        <span className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{item.model}</span>
      </div>
      <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end">
        <MediaPreview item={item} onPreview={onPreview} className="group w-full max-w-[620px]" />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={isGenerating} onClick={() => onEdit(item)}><Icon name="edit" />编辑</Button>
          <Button variant="secondary" disabled={isGenerating} onClick={() => onRegenerate(item)}><Icon name="refresh" />重新生成</Button>
          <Button variant="secondary" disabled={isGenerating} onClick={() => onDownload(item)}><Icon name="download" />下载</Button>
          <Button variant={isSaved ? "secondary" : "soft"} disabled={isSaved || isGenerating} onClick={() => onSaveAsset(item)}>
            <Icon name={isSaved ? "check" : "archive"} />{isSaved ? "已保存资产库" : "保存到资产库"}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function HistoryFeed({ historyItems, activeFilter, setActiveFilter, onSaveAsset, savedSourceIds, onEdit, onRegenerate, onDownload, onPreview }) {
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
      <div className="space-y-5">{filtered.map((item) => <HistoryItem key={item.id} item={item} onSaveAsset={onSaveAsset} isSaved={savedSourceIds.has(item.id)} onEdit={onEdit} onRegenerate={onRegenerate} onDownload={onDownload} onPreview={onPreview} />)}</div>
      {filtered.length === 0 ? <div className="rounded-[22px] bg-white/70 p-12 text-center text-sm font-semibold text-slate-400 ring-1 ring-white/80">暂无真实生成记录</div> : null}
    </section>
  );
}
