import React, { useState, useRef, useEffect } from "react";
import { Icon, cn } from "./Icon";
import { Button } from "./Button";
import { uploadProjectFiles } from "../api";

export const APP_VERSION = "v1.2.8";

function stopScrollBleed(event) {
  event.stopPropagation();
}

export function SelectPill({ id, value, options, onChange, openId, setOpenId }) {
  const open = openId === id;
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpenId(open ? null : id)} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">
        {value}<Icon name="chevron" />
      </button>
      {open ? (
        <div onWheel={stopScrollBleed} className="absolute bottom-full left-0 z-30 mb-2 max-h-60 w-40 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white shadow-xl overscroll-contain">
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

export function ComposerDock({ onGenerate, registerOpen, projectId, conversationId = "conv_default", assets = [], providers = [], mediaModels, editDraft, onEditDraftApplied, onUploaded }) {
  const config = {
    image: {
      uploadLabel: "图片 / 模板",
      models: ["GPT Image 2", "Visual Pro", "Studio Render"],
      aspects: ["9:16", "1:1", "16:9", "4:5"],
      qualities: ["high", "medium", "low"],
      sizes: ["1024x1792", "1024x1024", "1792x1024"],
      counts: ["1", "2", "3", "4"],
      placeholder: "上传参考图后，输入：参考 @图片1 的人物身份，生成 9:16 商业视觉封面。",
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
  const [quality, setQuality] = useState("high");
  const [size, setSize] = useState("1024x1792");
  const [count, setCount] = useState("1");
  const [endpoint, setEndpoint] = useState("");
  const [duration, setDuration] = useState("13秒");
  const [audio, setAudio] = useState("音画同步");
  const [prompt, setPrompt] = useState("");
  const [openSelectId, setOpenSelectId] = useState(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [uploadedAssets, setUploadedAssets] = useState([]);
  const current = config[type];
  const imageModels = mediaModels?.image?.length ? mediaModels.image : [{ id: "gpt-image-2", label: "GPT Image 2" }];
  const videoModels = mediaModels?.video?.length ? mediaModels.video : [{ id: "doubao-seedance-2-0-260128", label: "Doubao-Seedance-2.0" }];
  const modelOptions = (type === "image" ? imageModels : videoModels).map((item) => item.label || item.id);

  function modelIdFromLabel(label, surface = type) {
    const rows = surface === "image" ? imageModels : videoModels;
    return rows.find((item) => item.label === label || item.id === label)?.id || (surface === "image" ? "gpt-image-2" : "doubao-seedance-2-0-260128");
  }

  function fileUrlFromProjectFile(file) {
    const name = file.path || file.name;
    return projectId && name ? `/api/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(name)}` : undefined;
  }

  useEffect(() => {
    registerOpen?.(() => {
      setExpanded(true);
      requestAnimationFrame(() => textareaRef.current?.focus());
    });
    return () => registerOpen?.(null);
  }, [registerOpen]);

  useEffect(() => {
    if (!modelOptions.includes(model)) setModel(modelOptions[0]);
  }, [mediaModels, type]);

  useEffect(() => {
    const provider = providers.find((item) => item.id === "openai" || item.id === "gpt-image-2");
    const defaults = provider?.defaults || {};
    if (provider?.endpoint) setEndpoint(provider.endpoint);
    if (defaults.quality) setQuality(String(defaults.quality));
    if (defaults.size) setSize(String(defaults.size));
    if (defaults.count) setCount(String(defaults.count));
  }, [providers]);

  useEffect(() => {
    if (!editDraft) return;
    const nextType = editDraft.surface === "video" || editDraft.mediaType === "video" ? "video" : "image";
    const params = editDraft.params || {};
    setType(nextType);
    setPrompt(editDraft.prompt || "");
    setAspect(editDraft.aspect || params.aspect || "9:16");
    setExpanded(true);
    setOpenSelectId(null);
    setMentionQuery(null);
    if (nextType === "image") {
      const rows = imageModels;
      const nextModel = rows.find((item) => item.id === editDraft.modelId || item.label === editDraft.model)?.label || editDraft.model || rows[0]?.label || "GPT Image 2";
      setModel(nextModel);
      if (params.quality) setQuality(String(params.quality));
      if (params.size) setSize(String(params.size));
      if (params.n) setCount(String(params.n));
      if (params.endpoint) setEndpoint(String(params.endpoint));
    } else {
      const rows = videoModels;
      const nextModel = rows.find((item) => item.id === editDraft.modelId || item.label === editDraft.model)?.label || editDraft.model || rows[0]?.label || "Doubao-Seedance-2.0";
      setModel(nextModel);
      if (params.resolution) setQuality(String(params.resolution));
      if (editDraft.length || params.length) setDuration(`${editDraft.length || params.length}秒`);
      if (typeof params.audio === "boolean") setAudio(params.audio ? "音画同步" : "静音");
    }
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      const length = (editDraft.prompt || "").length;
      textareaRef.current?.setSelectionRange(length, length);
    });
    onEditDraftApplied?.(editDraft.id);
  }, [editDraft, mediaModels]);

  const apiAssets = assets.map((asset, index) => ({
    id: asset.id,
    label: asset.mention || `@${asset.mediaType === "video" ? "视频" : "图片"}${index + 1}`,
    keyword: String(asset.mention || `${asset.mediaType === "video" ? "视频" : "图片"}${index + 1}`).replace(/^@/, ""),
    type: asset.name || asset.storageName || asset.source || "素材",
    mediaType: asset.mediaType || asset.kind,
    fileName: asset.storageName || asset.name,
    path: asset.storageName || asset.path || asset.name,
    fileUrl: asset.fileUrl || asset.url,
    thumbnailUrl: asset.fileUrl || asset.url,
    previewUrl: asset.fileUrl || asset.url,
    color: "from-sky-400 to-indigo-500",
  }));
  const mentionAssets = [...uploadedAssets, ...apiAssets];
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

  async function uploadFiles(files) {
    if (files.length === 0) return;

    setExpanded(true);
    setOpenSelectId(null);

    for (const file of files) {
      const kind = getFileKind(file);
      const prefix = getUploadPrefix(kind);

      try {
        const data = await uploadProjectFiles(projectId, [file]);
        const savedFile = (data.files || [])[0] || {};
        const fileUrl = savedFile.fileUrl || savedFile.url || fileUrlFromProjectFile(savedFile);
        const thumbnailUrl = savedFile.thumbnailUrl || savedFile.thumbUrl || fileUrl;

        setUploadedAssets((currentAssets) => {
          const label = savedFile.mention || `@${prefix}${currentAssets.length + 1}`;

          return [{
            id: savedFile.id || savedFile.path || savedFile.name || `upload-${Date.now()}-${file.name}`,
            label,
            keyword: label.replace(/^@/, ""),
            type: savedFile.originalName || file.name,
            mediaType: kind,
            fileName: savedFile.name || file.name,
            path: savedFile.path || savedFile.name,
            fileSize: savedFile.fileSize || savedFile.size || file.size,
            fileUrl,
            thumbnailUrl,
            previewUrl: thumbnailUrl,
            uploaded: true,
            color: kind === "image" ? "from-sky-400 to-indigo-500" : kind === "video" ? "from-violet-500 to-fuchsia-500" : "from-emerald-300 to-teal-500",
          }, ...currentAssets];
        });
        onUploaded?.();
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
  }

  async function handleUploadFiles(event) {
    const files = Array.from(event.target.files || []);
    await uploadFiles(files);
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

  async function handlePaste(event) {
    const items = event.clipboardData?.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file" && items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      event.preventDefault();
      await uploadFiles(files);
    }
  }

  function switchType(nextType) {
    setType(nextType);
    setModel((nextType === "image" ? imageModels : videoModels)[0]?.label || config[nextType].models[0]);
    setQuality(nextType === "image" ? "high" : "720p");
    setAspect("9:16");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function generatePayload() {
    const mentions = [...prompt.matchAll(/@[一-龥]+\d+/g)].map((match) => match[0]);
    const referencedFile = mentionAssets.find((asset) => mentions.includes(asset.label));
    if (type === "image") {
      return {
        surface: "image",
        model: modelIdFromLabel(model, "image"),
        prompt: prompt.trim(),
        aspect,
        image: referencedFile?.path || referencedFile?.fileName,
        params: {
          mentions,
          size,
          quality,
          n: Number(count),
          endpoint: endpoint.trim() || undefined,
        },
      };
    }
    return {
      surface: "video",
      model: modelIdFromLabel(model, "video"),
      prompt: prompt.trim(),
      aspect,
      image: referencedFile?.path || referencedFile?.fileName,
      length: Number.parseInt(duration, 10) || 5,
      params: {
        mentions,
        resolution: quality,
        audio: audio !== "静音",
      },
    };
  }

  function submitGenerate() {
    if (!prompt.trim()) {
      textareaRef.current?.focus();
      return;
    }
    onGenerate(generatePayload());
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
              <Button onClick={() => { setExpanded(true); submitGenerate(); }} className="h-12 w-12 rounded-2xl px-0"><Icon name="upload" /></Button>
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
                {mentionAssets.length === 0 ? <span className="rounded-xl bg-slate-50 px-4 py-2.5 text-[13px] leading-5 font-semibold text-slate-400">暂无可引用素材，先上传图片后可使用 @图片1</span> : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100">
                <div className="relative">
                  <textarea ref={textareaRef} autoFocus value={prompt} onChange={handlePromptChange} onKeyDown={handlePromptKeyDown} onPaste={handlePaste} onFocus={(event) => { setOpenSelectId(null); const info = getMentionInfo(event.currentTarget.value, event.currentTarget.selectionStart || event.currentTarget.value.length); setMentionQuery(info ? info.query : null); }} className="min-h-[132px] w-full resize-none bg-transparent text-[15px] font-medium leading-7 text-slate-700 outline-none placeholder:text-slate-400" placeholder={current.placeholder} />
                  {mentionQuery !== null ? (
                    <div onWheel={(e) => e.stopPropagation()} className="absolute left-0 top-9 z-40 max-h-72 w-80 overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl overscroll-contain">
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
                  <SelectPill id="model" value={model} options={modelOptions.length ? modelOptions : current.models} onChange={setModel} openId={openSelectId} setOpenId={setOpenSelectId} />
                  <SelectPill id="aspect" value={aspect} options={current.aspects} onChange={setAspect} openId={openSelectId} setOpenId={setOpenSelectId} />
                  <SelectPill id="quality" value={quality} options={current.qualities} onChange={setQuality} openId={openSelectId} setOpenId={setOpenSelectId} />
                  {type === "image" ? <SelectPill id="size" value={size} options={current.sizes} onChange={setSize} openId={openSelectId} setOpenId={setOpenSelectId} /> : null}
                  {type === "image" ? <SelectPill id="count" value={count} options={current.counts} onChange={setCount} openId={openSelectId} setOpenId={setOpenSelectId} /> : null}
                  {type === "video" ? <SelectPill id="duration" value={duration} options={current.durations} onChange={setDuration} openId={openSelectId} setOpenId={setOpenSelectId} /> : null}
                  {type === "video" ? <SelectPill id="audio" value={audio} options={current.audio} onChange={setAudio} openId={openSelectId} setOpenId={setOpenSelectId} /> : null}
                </div>
                {type === "image" ? <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="GPT endpoint" className="min-w-[220px] flex-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-100" /> : null}
                <Button onClick={submitGenerate} className={cn("px-8", !prompt.trim() && "opacity-90")}><Icon name="upload" />{type === "image" ? "生成图片" : "生成视频"}</Button>
              </div>
            </div>
          )}
        </section>
        <div className="mt-3 hidden justify-center gap-8 text-xs font-medium text-slate-400 sm:flex"><span>{APP_VERSION}</span><span>试用体验内容均由人工智能模型生成</span><span>免责声明</span><span>测试协议</span><span>隐私政策</span></div>
      </div>
    </div>
  );
}
