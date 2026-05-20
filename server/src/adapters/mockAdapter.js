import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { DATA_DIR, json, now } from '../db.js';

export function createMockResult({ db, conversationId, jobId, kind, prompt, params }) {
  const resultId = `res_${nanoid(10)}`;
  const ext = kind === 'video' ? '.html' : '.svg';
  const dir = path.join(DATA_DIR, 'results', conversationId);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${resultId}${ext}`);
  const content = kind === 'video' ? mockHtml(prompt, params) : mockSvg(prompt, params);
  fs.writeFileSync(filePath, content);
  const t = now();
  db.prepare('INSERT INTO results (id,job_id,conversation_id,kind,path,thumbnail_path,meta_json,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(resultId, jobId, conversationId, kind, filePath, null, json({ mock: true, prompt, params }), t);
  return { id: resultId, kind, path: filePath, fileUrl: `/api/results/${resultId}/file`, downloadUrl: `/api/results/${resultId}/download`, meta: { mock: true } };
}

function esc(s='') { return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function mockSvg(prompt, params) { return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1792" viewBox="0 0 1024 1792"><defs><linearGradient id="bg" x1="0" x2="1"><stop stop-color="#fbfaf7"/><stop offset="1" stop-color="#edf3ff"/></linearGradient><linearGradient id="body" y1="0" y2="1"><stop stop-color="#3c3156"/><stop offset=".45" stop-color="#b85a8a"/><stop offset=".46" stop-color="#30364d"/></linearGradient></defs><rect width="1024" height="1792" fill="url(#bg)"/><text x="80" y="140" font-family="system-ui" font-size="54" fill="#5b7cfa" opacity=".18" font-weight="800">Illusory Generated Result</text><rect x="382" y="410" width="260" height="760" rx="130" fill="url(#body)"/><ellipse cx="512" cy="1250" rx="260" ry="70" fill="#5b7cfa" opacity=".12"/><text x="80" y="1600" font-family="system-ui" font-size="28" fill="#536073">${esc(prompt).slice(0,120)}</text></svg>`; }
function mockHtml(prompt, params) { return `<!doctype html><html><body><video controls style="width:100%;height:100%;background:#111"></video><pre>${esc(prompt)}</pre></body></html>`; }
