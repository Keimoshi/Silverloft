import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { DATA_DIR, json, now } from '../db.js';

export const resourcesRouter = Router();

resourcesRouter.post('/download', (req, res) => {
  const db = req.app.locals.db;
  const { url = '', platform = 'auto', conversationId = 'conv_default' } = req.body || {};
  if (!url.trim()) return res.status(400).json({ error: 'url_required' });
  const t = now();
  const jobId = `job_${nanoid(10)}`;
  const resultId = `res_${nanoid(10)}`;
  const dir = path.join(DATA_DIR, 'results', conversationId);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${resultId}.json`);
  fs.writeFileSync(filePath, JSON.stringify({ url, platform, note:'mock resource record; production adapter calls local res-downloader' }, null, 2));
  const request = { url, platform, preferOriginal:true, noWatermark:true };
  const result = { id:resultId, kind:'resource', downloadUrl:`/api/results/${resultId}/download`, meta:{ url, platform, mock:true } };
  db.prepare('INSERT INTO jobs (id,conversation_id,message_id,provider_id,kind,status,request_json,result_json,error,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(jobId, conversationId, null, 'res-local', 'resource', 'succeeded', json(request), json({ results:[result] }), null, t, t);
  db.prepare('INSERT INTO results (id,job_id,conversation_id,kind,path,thumbnail_path,meta_json,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(resultId, jobId, conversationId, 'resource', filePath, null, json(result.meta), t);
  res.json({ job:{ id:jobId, status:'succeeded', providerId:'res-local', kind:'resource' }, result });
});
