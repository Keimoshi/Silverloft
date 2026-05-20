import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
export const DATA_DIR = path.join(ROOT, 'data');
export const DEFAULT_DB = path.join(DATA_DIR, 'illusory-console.sqlite');
export const DEFAULT_SCRIPT_PATH = path.join(ROOT, 'skills', 'gpt2image.py');
export const DEFAULT_SEEDANCE_SCRIPT_PATH = path.join(ROOT, 'skills', 'seedance_video.py');

function envText(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function now() { return new Date().toISOString(); }
export function json(value) { return JSON.stringify(value ?? {}); }
export function parseJson(value, fallback = {}) { try { return JSON.parse(value); } catch { return fallback; } }

export function initDb(dbPath = DEFAULT_DB) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  migrate(db);
  seed(db);
  return db;
}

function migrate(db) {
  const cols = db.prepare('PRAGMA table_info(assets)').all().map(c => c.name);
  const add = (name, sql) => { if (!cols.includes(name)) db.exec(sql); };
  add('source_result_id', 'ALTER TABLE assets ADD COLUMN source_result_id TEXT');
  add('saved', 'ALTER TABLE assets ADD COLUMN saved INTEGER NOT NULL DEFAULT 0');
  add('tags_json', "ALTER TABLE assets ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]'");
}

function seed(db) {
  const t = now();
  db.prepare('INSERT OR IGNORE INTO conversations (id,title,created_at,updated_at) VALUES (?,?,?,?)')
    .run('conv_default', '默认创作会话', t, t);

  const insertProvider = db.prepare(`INSERT OR IGNORE INTO providers
    (id,kind,name,adapter_type,script_path,endpoint,api_key_ref,model,defaults_json,form_schema_json,enabled,created_at,updated_at)
    VALUES (@id,@kind,@name,@adapter_type,@script_path,@endpoint,@api_key_ref,@model,@defaults_json,@form_schema_json,1,@created_at,@updated_at)`);
  const providers = [
    { id:'gpt-image-2', kind:'image', name:'GPT Image 2', adapter_type:'script', script_path:DEFAULT_SCRIPT_PATH, endpoint:envText('GPT2IMAGE_ENDPOINT'), api_key_ref:'AI_TOUR_NET_API_KEY', model:'gpt-image-2', defaults:{ratio:'9:16',resolution:'2K',count:1}, form:{fields:['prompt','images','ratio','resolution','count']} },
    { id:'seedance-2', kind:'video', name:'Seedance 2.0', adapter_type:'script', script_path:DEFAULT_SEEDANCE_SCRIPT_PATH, endpoint:envText('ARK_BASE_URL'), api_key_ref:'ARK_API_KEY', model:'doubao-seedance-2-0-260128', defaults:{ratio:'9:16',resolution:'720p',duration:5,count:1,audio:true}, form:{fields:['prompt','images','videos','ratio','resolution','duration','audio']} },
    { id:'res-local', kind:'resource', name:'res 下载器', adapter_type:'res-downloader', script_path:null, endpoint:envText('RES_DOWNLOADER_ENDPOINT') || 'http://127.0.0.1:8899', api_key_ref:null, model:'res-downloader', defaults:{preferOriginal:true,noWatermark:true}, form:{fields:['url','platform','output']} }
  ];
  for (const p of providers) insertProvider.run({ ...p, defaults_json: json(p.defaults), form_schema_json: json(p.form), created_at:t, updated_at:t });

  const insertTemplate = db.prepare(`INSERT OR IGNORE INTO templates (id,title,category,description,prompt,params_json,created_at,updated_at) VALUES (@id,@title,@category,@description,@prompt,@params_json,@created_at,@updated_at)`);
  const templates = [
    { id:'tpl_live_cover', title:'直播封面', category:'直播', description:'9:16 女团直播主视觉封面', prompt:'参考 @图片1 的人物身份，生成 Illusory 女团直播封面，商业摄影质感，9:16，舞台灯光，高级但不塑料。', params:{kind:'image', ratio:'9:16', resolution:'2K', count:1} },
    { id:'tpl_first_frame', title:'出场首帧', category:'视频', description:'视频开场首帧，强调人物和舞台气势', prompt:'参考 @图片1 的人物形象，生成短视频出场首帧，正面半身，强舞台光，适合作为视频第一帧。', params:{kind:'image', ratio:'9:16', resolution:'2K', count:1} },
    { id:'tpl_fitting', title:'换装展示', category:'换装', description:'人物图 + 服装参考图的带货视觉', prompt:'参考 @图片1 的人物身份，把 @图片2 的服装穿到人物身上，生成竖屏直播换装展示图，真实布料质感。', params:{kind:'image', ratio:'9:16', resolution:'2K', count:1} },
    { id:'tpl_product', title:'商品带货图', category:'电商', description:'商品与直播间场景组合图', prompt:'参考 @图片1 的商品外观，生成直播间带货主视觉，浅色高级布景，商业摄影质感。', params:{kind:'image', ratio:'9:16', resolution:'2K', count:1} }
  ];
  for (const tpl of templates) insertTemplate.run({ ...tpl, params_json: json(tpl.params), created_at:t, updated_at:t });

  const insertPersona = db.prepare(`INSERT OR IGNORE INTO personas (id,name,mention,role,description,base_asset_id,params_json,created_at,updated_at) VALUES (@id,@name,@mention,@role,@description,@base_asset_id,@params_json,@created_at,@updated_at)`);
  const personas = [
    { id:'persona_veya', name:'Veya', mention:'@人像1', role:'Illusory 女团成员', description:'冷艳暗黑系女团虚拟人像，可作为直播封面、首帧和视频人物身份参考。', base_asset_id:null, params:{style:'premium virtual idol editorial'} },
    { id:'persona_luna', name:'Luna', mention:'@人像2', role:'Illusory 女团成员', description:'高端棚拍感虚拟偶像人像，适合纯欲、时尚、轻商业视觉。', base_asset_id:null, params:{style:'premium virtual idol editorial'} }
  ];
  for (const p of personas) insertPersona.run({ ...p, base_asset_id:null, params_json: json(p.params), created_at:t, updated_at:t });
}
