import { Router } from 'express';

export const conversationsRouter = Router();

function hydrateResult(row) {
  return row ? { id: row.id, kind: row.kind, fileUrl: `/api/results/${row.id}/file`, downloadUrl: `/api/results/${row.id}/download`, meta: JSON.parse(row.meta_json || '{}') } : null;
}

conversationsRouter.get('/current', (req, res) => {
  const conv = req.app.locals.db.prepare('SELECT * FROM conversations WHERE id=?').get('conv_default');
  res.json(conv);
});

conversationsRouter.get('/:id/messages', (req, res) => {
  const db = req.app.locals.db;
  const messages = db.prepare('SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC').all(req.params.id).map(m => {
    const job = db.prepare('SELECT * FROM jobs WHERE message_id=? ORDER BY created_at DESC LIMIT 1').get(m.id);
    const results = job ? db.prepare('SELECT * FROM results WHERE job_id=? ORDER BY created_at ASC').all(job.id).map(hydrateResult) : [];
    return { id:m.id, role:m.role, prompt:m.prompt, mentions:JSON.parse(m.mentions_json||'[]'), params:JSON.parse(m.params_json||'{}'), createdAt:m.created_at, job: job ? { id:job.id, status:job.status, kind:job.kind, providerId:job.provider_id } : null, results };
  });
  const assets = db.prepare('SELECT id,kind,alias,mention,storage_name as storageName,original_name as originalName,mime_type as mimeType,size_bytes as sizeBytes FROM assets WHERE conversation_id=? ORDER BY created_at ASC').all(req.params.id).map(a => ({ ...a, url:`/api/assets/${a.id}/file` }));
  res.json({ messages, assets });
});
