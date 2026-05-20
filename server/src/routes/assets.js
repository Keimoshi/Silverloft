import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { nanoid } from 'nanoid';
import { DATA_DIR, json, now } from '../db.js';
import { nextAssetName } from '../lib/assetNaming.js';

export const assetsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

assetsRouter.post('/upload', upload.single('file'), (req, res) => {
  const db = req.app.locals.db;
  const conversationId = req.body.conversationId || 'conv_default';
  const kind = req.body.kind || 'image';
  if (!req.file) return res.status(400).json({ error: 'file_required' });
  if (!['image','video','audio'].includes(kind)) return res.status(400).json({ error: 'invalid_kind' });
  const ext = path.extname(req.file.originalname || '') || guessExt(req.file.mimetype);
  const naming = nextAssetName(db, conversationId, kind, ext);
  const dir = path.join(DATA_DIR, 'uploads', conversationId);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, naming.storageName);
  fs.writeFileSync(filePath, req.file.buffer);
  const id = `asset_${nanoid(10)}`;
  const t = now();
  db.prepare(`INSERT INTO assets (id,conversation_id,kind,alias,mention,storage_name,original_name,mime_type,size_bytes,path,thumbnail_path,meta_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, conversationId, kind, naming.alias, naming.mention, naming.storageName, req.file.originalname, req.file.mimetype, req.file.size, filePath, null, json({ index:naming.index }), t);
  res.json({ id, kind, alias:naming.alias, mention:naming.mention, storageName:naming.storageName, originalName:req.file.originalname, mimeType:req.file.mimetype, sizeBytes:req.file.size, url:`/api/assets/${id}/file` });
});

assetsRouter.get('/:id/file', (req, res) => {
  const row = req.app.locals.db.prepare('SELECT * FROM assets WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'asset_not_found' });
  res.type(row.mime_type || 'application/octet-stream');
  res.sendFile(row.path);
});

function guessExt(mime) {
  if (mime === 'image/png') return '.png';
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'video/mp4') return '.mp4';
  if (mime === 'audio/mpeg') return '.mp3';
  return '.bin';
}
