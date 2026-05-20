import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { DATA_DIR, json, now, parseJson } from '../db.js';
import { resolveMentions } from '../lib/mentions.js';
import { createMockResult } from '../adapters/mockAdapter.js';
import { createGptImageResult } from '../adapters/gptImageAdapter.js';

export const generateRouter = Router();

function resultDto(row) {
  return { id: row.id, kind: row.kind, fileUrl: `/api/results/${row.id}/file`, downloadUrl: `/api/results/${row.id}/download`, meta: parseJson(row.meta_json) };
}

async function createGeneration({ req, res, body }) {
  const db = req.app.locals.db;
  const { conversationId = 'conv_default', providerId = 'gpt-image-2', kind = 'image', prompt = '', params = {}, mentions = [] } = body || {};
  if (!prompt.trim()) return res.status(400).json({ error: 'prompt_required' });
  const provider = db.prepare('SELECT * FROM providers WHERE id=? AND enabled=1').get(providerId);
  if (!provider) return res.status(400).json({ error: 'provider_not_found' });
  let resolved;
  try { resolved = resolveMentions(db, conversationId, mentions, prompt); }
  catch (e) { return res.status(e.status || 500).json({ error: e.message }); }
  const t = now();
  const messageId = `msg_${nanoid(10)}`;
  db.prepare('INSERT INTO messages (id,conversation_id,role,prompt,mentions_json,params_json,created_at) VALUES (?,?,?,?,?,?,?)')
    .run(messageId, conversationId, 'user', prompt, json(resolved), json(params), t);
  const jobId = `job_${nanoid(10)}`;
  db.prepare('INSERT INTO jobs (id,conversation_id,message_id,provider_id,kind,status,request_json,result_json,error,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(jobId, conversationId, messageId, providerId, kind, 'running', json({ prompt, params, mentions: resolved }), json({}), null, t, t);
  try {
    const result = providerId === 'gpt-image-2' && kind === 'image'
      ? await createGptImageResult({ db, conversationId, jobId, prompt, params, provider, resolvedMentions: resolved, scriptRunner: req.app.locals.scriptRunner })
      : createMockResult({ db, conversationId, jobId, kind, prompt, params });
    db.prepare('UPDATE jobs SET status=?, result_json=?, updated_at=? WHERE id=?').run('succeeded', json({ results:[result] }), now(), jobId);
    return res.json({ job: { id: jobId, status: 'succeeded', kind, providerId }, message: { id: messageId }, results: [result] });
  } catch (e) {
    db.prepare('UPDATE jobs SET status=?, error=?, updated_at=? WHERE id=?').run('failed', e.message || 'generation_failed', now(), jobId);
    return res.status(502).json({ error: 'generation_failed', detail: e.message || String(e), job: { id: jobId, status: 'failed', kind, providerId } });
  }
}

generateRouter.post('/generate', async (req, res) => {
  return createGeneration({ req, res, body: req.body });
});

generateRouter.get('/results/:id/file', (req, res) => {
  const row = req.app.locals.db.prepare('SELECT * FROM results WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'result_not_found' });
  res.type(row.kind === 'image' ? path.extname(row.path).slice(1) || 'png' : 'application/octet-stream');
  res.sendFile(row.path);
});

generateRouter.get('/results/:id/download', (req, res) => {
  const row = req.app.locals.db.prepare('SELECT * FROM results WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'result_not_found' });
  res.download(row.path);
});

generateRouter.post('/results/:id/save-to-assets', (req, res) => {
  const db = req.app.locals.db;
  const row = db.prepare('SELECT * FROM results WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'result_not_found' });
  const ext = path.extname(row.path) || (row.kind === 'video' ? '.mp4' : row.kind === 'image' ? '.svg' : '.json');
  const count = db.prepare('SELECT COUNT(*) as n FROM assets WHERE saved=1').get().n + 1;
  const alias = `资产${count}`;
  const storageName = `asset_${String(count).padStart(3, '0')}${ext}`;
  const dir = path.join(DATA_DIR, 'asset-library');
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, storageName);
  fs.copyFileSync(row.path, target);
  const id = `asset_${nanoid(10)}`;
  const meta = { ...parseJson(row.meta_json), assetFolder: req.body?.folder || '未分类' };
  db.prepare(`INSERT INTO assets (id,conversation_id,kind,alias,mention,storage_name,original_name,mime_type,size_bytes,path,thumbnail_path,meta_json,source_result_id,saved,tags_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, row.conversation_id, row.kind, alias, `@${alias}`, storageName, req.body?.name || storageName, row.kind === 'image' ? mimeFromExt(ext) : 'application/octet-stream', fs.statSync(target).size, target, null, json(meta), row.id, 1, json(req.body?.tags || []), now());
  res.json({ id, kind: row.kind, alias, mention:`@${alias}`, storageName, originalName:req.body?.name || storageName, sourceResultId:row.id, saved:true, meta, url:`/api/assets/${id}/file` });
});

generateRouter.post('/results/:id/regenerate', async (req, res) => {
  const db = req.app.locals.db;
  const row = db.prepare('SELECT r.*, j.request_json, j.provider_id FROM results r JOIN jobs j ON r.job_id=j.id WHERE r.id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'result_not_found' });
  const request = parseJson(row.request_json);
  return createGeneration({ req, res, body: { conversationId: row.conversation_id, providerId: row.provider_id, kind: row.kind, prompt: request.prompt || '重新生成', params: request.params || {}, mentions: [] } });
});

function mimeFromExt(ext) {
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}
