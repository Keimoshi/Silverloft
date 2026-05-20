import { useEffect, useMemo, useRef, useState } from 'react';
import {
  downloadResource, generate, getAllAssets, getAssetLibrary, getCurrentConversation, getJobs,
  getMessages, getPersonas, getProviders, getTemplates, regenerateResult, saveResultToAssets,
  updateProvider, uploadAsset
} from './api.js';

const navItems = ['探索','创作','资源','任务','资产','设置'];
const subTabs = ['模板库','素材库','虚拟人像库','我的','资产库'];

export default function App() {
  const [page, setPage] = useState('创作');
  const [subTab, setSubTab] = useState('模板库');
  const [conversation, setConversation] = useState(null);
  const [assets, setAssets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [providers, setProviders] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [assetLibrary, setAssetLibrary] = useState([]);
  const [allAssets, setAllAssets] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState('image');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const fileRef = useRef(null);

  async function refresh(convId = conversation?.id || 'conv_default') {
    const [data, providersData, templatesData, personasData, jobsData, assetLibData, allAssetData] = await Promise.all([
      getMessages(convId), getProviders(), getTemplates(), getPersonas(), getJobs(), getAssetLibrary(), getAllAssets()
    ]);
    setAssets(data.assets || []);
    setMessages(data.messages || []);
    setProviders(providersData);
    setTemplates(templatesData);
    setPersonas(personasData);
    setJobs(jobsData);
    setAssetLibrary(assetLibData);
    setAllAssets(allAssetData);
  }

  useEffect(() => {
    (async () => {
      const conv = await getCurrentConversation();
      setConversation(conv);
      await refresh(conv.id);
    })().catch(err => alert(err.message));
  }, []);

  const providerId = kind === 'video' ? 'seedance-2' : 'gpt-image-2';
  const provider = providers.find(p => p.id === providerId);
  const mentionCandidates = useMemo(() => [
    ...assets,
    ...personas.map(p => ({ id:p.id, kind:'persona', alias:p.name, mention:p.mention, storageName:p.role, description:p.description })),
    ...templates.map(t => ({ id:t.id, kind:'template', alias:t.title, mention:`@模板${templates.indexOf(t)+1}`, storageName:t.category, description:t.description, prompt:t.prompt, params:t.params }))
  ], [assets, personas, templates]);
  const mentionsInPrompt = useMemo(() => [...prompt.matchAll(/@[\u4e00-\u9fa5]+\d+/g)].map(m => m[0]), [prompt]);

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;
    const uploadKind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image';
    await uploadAsset({ conversationId: conversation.id, kind: uploadKind, file });
    await refresh(conversation.id);
    setNotice('素材已上传并自动编号，可在输入框用 @ 引用。');
    e.target.value = '';
  }

  function insertMention(item) {
    if (item.prompt) {
      setPrompt(item.prompt);
      if (item.params?.kind) setKind(item.params.kind);
    } else {
      setPrompt(p => `${p.trim()} ${item.mention} `);
    }
    setMentionOpen(false);
    setPage('创作');
  }

  async function onGenerate(customPrompt = prompt, customKind = kind) {
    if (!conversation || busy) return;
    if (!customPrompt.trim()) return setNotice('请输入创作描述，或先选择一个模板。');
    setBusy(true);
    try {
      await generate({
        conversationId: conversation.id,
        providerId: customKind === 'video' ? 'seedance-2' : 'gpt-image-2',
        kind: customKind,
        prompt: customPrompt,
        mentions: [...customPrompt.matchAll(/@[\u4e00-\u9fa5]+\d+/g)].map(m => m[0]).filter(m => assets.some(a => a.mention === m)),
        params: customKind === 'video' ? { mode:'reference', ratio:'9:16', resolution:'720p', duration:5, count:1, audio:true } : { mode:'image', ratio:'9:16', resolution:'2K', count:1 }
      });
      setPrompt('');
      await refresh(conversation.id);
      setNotice('生成完成，结果已进入历史流。');
      setPage('创作');
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  }

  async function saveResult(id) { await saveResultToAssets(id); await refresh(); setNotice('已保存到资产库。'); setPage('资产'); }
  async function regen(id) { await regenerateResult(id); await refresh(); setNotice('已重新生成一版。'); }
  async function startVideoFromResult() { setKind('video'); setPrompt('参考上一个结果作为视频首帧，生成 9:16 直播出场短视频，镜头稳定，人物不变形。'); setPage('创作'); }

  return <div className="app">
    <aside className="rail"><div className="logo" onClick={() => setPage('探索')}>I</div><nav className="nav">{navItems.map(n=><button className={page===n?'active':''} key={n} onClick={() => setPage(n)}><span className="ico" />{n}</button>)}</nav><div className="avatar">K</div></aside>
    <main className="main">
      <header className="top"><div className="brand"><h1>Illusory Studio</h1><p>对话式商业视觉工作台 · 图片 / 视频 / 资源统一创作入口</p></div><div className="tabs"><button className={page==='探索'?'on':''} onClick={()=>setPage('探索')}>灵感</button><button className={page==='创作'?'on':''} onClick={()=>setPage('创作')}>创建</button><button className={page==='资产'?'on':''} onClick={()=>setPage('资产')}>结果库</button></div></header>
      {notice && <div className="notice" onClick={()=>setNotice('')}>{notice}</div>}
      <section className="feed"><div className="feedInner"><PageContent page={page} setPage={setPage} templates={templates} personas={personas} assets={allAssets} assetLibrary={assetLibrary} jobs={jobs} providers={providers} messages={messages} onTemplate={insertMention} onPersona={insertMention} onGenerate={onGenerate} onResource={async (url)=>{ const r=await downloadResource({ url, conversationId:conversation?.id }); await refresh(); setNotice('资源任务已完成：'+r.result.id); setPage('任务'); }} onProvider={async (id,payload)=>{ await updateProvider(id,payload); await refresh(); setNotice('配置已保存。'); }} actions={{ saveResult, regen, startVideoFromResult }} /></div></section>
      {page === '创作' && <section className="composerWrap">
        <div className="libraryTabs">{subTabs.map(t=><button key={t} onClick={()=>setSubTab(t)} className={subTab===t?'on':''}>{t}</button>)}</div>
        <LibraryPanel subTab={subTab} templates={templates} personas={personas} assets={allAssets} assetLibrary={assetLibrary} onPick={insertMention} setPage={setPage}/>
        <div className="composer">
          <div className="composeBody"><button className="upload" onClick={() => fileRef.current?.click()}><b>＋</b><span>图片 / 视频 / 音频</span></button><textarea value={prompt} onChange={e => { setPrompt(e.target.value); setMentionOpen(e.target.value.endsWith('@')); }} placeholder="使用 @ 引用素材或虚拟人像，如：参考 @图片1 的人物身份，结合 @模板1 的直播封面结构，生成 9:16 商业视觉图。" /></div>
          <input ref={fileRef} type="file" hidden onChange={onUpload} accept="image/*,video/*,audio/*" />
          {mentionOpen && <div className="mention">{mentionCandidates.length === 0 ? <div className="mentionRow"><div className="thumb"/><div><b>暂无素材</b><span>请先上传图片/视频/音频</span></div></div> : mentionCandidates.map(a => <button className="mentionRow" key={a.id} onClick={() => insertMention(a)}><AssetThumb asset={a}/><div><b>{a.alias}</b><span>{a.storageName || a.description}</span></div></button>)}</div>}
          <div className="assetStrip">{mentionCandidates.slice(0,8).map(a => <button key={a.id} className="assetChip" onClick={() => insertMention(a)}><AssetThumb asset={a}/><span>{a.mention}</span><small>{a.storageName || a.description}</small></button>)}</div>
          <div className="controls"><button className="select" onClick={() => setKind(kind === 'image' ? 'video' : 'image')}>{kind === 'image' ? '图片生成' : '视频生成'}</button><span className="select">智能比例</span><span className="select">{kind === 'image' ? '2K' : '720p'}</span><span className="select">{kind === 'image' ? '1张' : '5秒'}</span><span className="select">{provider?.name || providerId}</span><span className="cost">商业版 · 预计消耗 1 次生成</span><button className="send" onClick={()=>onGenerate()} disabled={busy}>{busy ? '…' : '↑'}</button></div>
        </div>
      </section>}
    </main>
  </div>;
}

function PageContent({ page, setPage, templates, personas, assets, assetLibrary, jobs, providers, messages, onTemplate, onPersona, onGenerate, onResource, onProvider, actions }) {
  if (page === '探索') return <Dashboard templates={templates} personas={personas} setPage={setPage} onTemplate={onTemplate}/>;
  if (page === '资源') return <ResourcePage onResource={onResource} assets={assets}/>;
  if (page === '任务') return <JobsPage jobs={jobs}/>;
  if (page === '资产') return <AssetPage assets={assetLibrary} allAssets={assets}/>;
  if (page === '设置') return <SettingsPage providers={providers} onProvider={onProvider}/>;
  return <CreateFeed messages={messages} actions={actions} onGenerate={onGenerate}/>;
}

function Dashboard({ templates, personas, setPage, onTemplate }) { return <div className="gridPage"><HeroCard title="今日创作台" text="选择模板、上传素材或直接输入提示词，所有结果会沉淀到资产库。" action="开始创作" onClick={()=>setPage('创作')}/><div className="panel"><div className="sectionLabel">QUICK TOOLS</div><h2>快捷工作流</h2><div className="toolGrid"><Tool title="封面图" sub="直播间主视觉"/><Tool title="首帧" sub="视频开场图"/><Tool title="换装" sub="人像+服装"/></div></div><div className="panel"><div className="sectionLabel">PERSONAS</div><h2>虚拟人像</h2>{personas.map(p=><button className="templateWide" key={p.id} onClick={()=>setPage('创作')}><div className="libThumb"/><div><b>{p.name}</b><p>{p.description}</p></div><span>{p.mention}</span></button>)}</div>{templates.map(t=><InfoCard key={t.id} title={t.title} sub={t.description} onClick={()=>onTemplate(t)}/>)}</div>; }
function Tool({title,sub}){return <div className="toolCard"><i/><b>{title}</b><span>{sub}</span></div>}
function ResourcePage({ onResource, assets }) { const [url,setUrl]=useState(''); return <div className="workspaceGrid"><div className="panel resourcePanel"><div className="sectionLabel">RESOURCE INGEST</div><h2>资源获取</h2><div className="resourceBar"><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="粘贴抖音 / 小红书 / 视频 / 图片链接"/><button onClick={()=>url && onResource(url)}>获取资源</button></div><div className="resourceQuick"><button>抖音无水印</button><button>小红书原图</button><button>视频提取</button><button>图片批量</button></div><div className="metricGrid"><div><b>{assets.length}</b><span>最近素材</span></div><div><b>原图优先</b><span>资源策略</span></div><div><b>本地组件</b><span>下载引擎</span></div></div></div><div className="panel"><div className="sectionLabel">RECENT ASSETS</div><h2>最近素材</h2><CardList items={assets} empty="暂无素材"/></div></div>; }
function JobsPage({ jobs }) { return <div className="panel"><div className="sectionLabel">LIVE OPERATIONS</div><h2>任务中心</h2><div className="metricGrid"><div><b>{jobs.length}</b><span>全部任务</span></div><div><b>{jobs.filter(j=>j.status==='succeeded').length}</b><span>已完成</span></div><div><b>{jobs.filter(j=>j.status==='running').length}</b><span>运行中</span></div></div><div className="table">{jobs.length===0?<p>暂无任务</p>:jobs.map(j=><div className="row" key={j.id}><b>{j.kind}</b><span>{j.providerId}</span><span>{j.status}</span><small>{new Date(j.createdAt).toLocaleString()}</small></div>)}</div></div>; }
function AssetPage({ assets, allAssets }) { const shown=assets.length?assets:allAssets; return <div className="panel"><div className="sectionLabel">ASSET LIBRARY</div><h2>资产库</h2><div className="metricGrid"><div><b>{shown.length}</b><span>资产数量</span></div><div><b>{shown.filter(a=>a.kind==='image').length}</b><span>图片</span></div><div><b>{shown.filter(a=>a.kind==='video').length}</b><span>视频</span></div></div><CardList items={shown} empty="暂无资产，请先生成并保存。"/></div>; }
function SettingsPage({ providers, onProvider }) { return <div className="panel"><div className="sectionLabel">CONTROL PLANE</div><h2>设置</h2><div className="settingsGrid">{providers.map(p=><ProviderEditor key={p.id} provider={p} onSave={onProvider}/>)}</div></div>; }
function ProviderEditor({ provider, onSave }) { const [endpoint,setEndpoint]=useState(provider.endpoint||''); const [model,setModel]=useState(provider.model||''); const [scriptPath,setScriptPath]=useState(provider.scriptPath||''); return <div className="provider"><h3>{provider.name}</h3><label>endpoint<input value={endpoint} onChange={e=>setEndpoint(e.target.value)}/></label><label>model<input value={model} onChange={e=>setModel(e.target.value)}/></label><label>script<input value={scriptPath} onChange={e=>setScriptPath(e.target.value)}/></label><button onClick={()=>onSave(provider.id,{endpoint,model,scriptPath})}>保存配置</button></div>; }
function CreateFeed({ messages, actions }) { return <>{messages.length === 0 && <div className="empty"><h2>从一句描述开始创作</h2><p>上传素材，输入 @ 引用图片、视频或音频，生成结果会出现在这里。</p></div>}{messages.map(m => <HistoryEntry key={m.id} message={m} actions={actions} />)}</>; }
function LibraryPanel({ subTab, templates, personas, assets, assetLibrary, onPick, setPage }) { const map={ '模板库':templates, '素材库':assets, '虚拟人像库':personas, '我的':templates.slice(0,2), '资产库':assetLibrary }; const items=map[subTab]||[]; return <div className="libraryPanel">{items.length===0?<button className="libCard" onClick={()=>setPage(subTab==='资产库'?'资产':'资源')}><div className="libThumb"/><b>暂无内容</b><small>点击进入对应模块</small></button>:items.slice(0,6).map((it,i)=><button className="libCard" key={it.id||i} onClick={()=>onPick(it)}><div className="libThumb"/><b>{it.title||it.name||it.alias}</b><small>{it.description||it.role||it.storageName}</small></button>)}</div>; }
function CardList({ items, empty }) { return <div className="cards">{items.length===0?<p>{empty}</p>:items.map(a=><div className="assetCard" key={a.id}><AssetThumb asset={a}/><b>{a.alias||a.title||a.name}</b><small>{a.storageName||a.description}</small>{a.url&&<a href={a.url}>下载</a>}</div>)}</div>; }
function HeroCard({ title, text, action, onClick }) { return <div className="heroCard"><h2>{title}</h2><p>{text}</p><button onClick={onClick}>{action}</button></div>; }
function InfoCard({ title, sub, onClick }) { return <button className="infoCard" onClick={onClick}><b>{title}</b><span>{sub}</span></button>; }
function AssetThumb({ asset }) { return asset.mimeType?.startsWith('image/') ? <img className="thumb" src={asset.url} /> : <div className="thumb">{asset.kind?.slice(0,2)||'素'}</div>; }
function HistoryEntry({ message, actions }) { return <article className="entry"><div className="time">{new Date(message.createdAt).toLocaleString()}</div><div className="promptLine"><MentionText text={message.prompt}/></div><div className="params">{Object.entries(message.params || {}).map(([k,v]) => <span className="pill" key={k}>{String(v)}</span>)}<span className="pill">{message.job?.providerId}</span></div>{message.results?.map(r => <div className="result" key={r.id}><div className="imagePreview"><img src={r.downloadUrl} /></div><div className="actions"><button className="btn" onClick={()=>alert('编辑面板已打开：下一版接入局部重绘/改提示词。')}>编辑</button><button className="btn" onClick={()=>actions.regen(r.id)}>重新生成</button><a className="btn" href={r.downloadUrl}>下载{r.kind === 'video' ? '视频' : '图片'}</a><button className="btn" onClick={actions.startVideoFromResult}>生成视频</button><button className="btn primary" onClick={()=>actions.saveResult(r.id)}>保存到资产库</button></div></div>)}</article>; }
function MentionText({ text }) { return <>{text.split(/(@[\u4e00-\u9fa5]+\d+)/g).map((part,i)=> part.startsWith('@') ? <span className="token" key={i}><i/>{part}</span> : part)}</>; }
