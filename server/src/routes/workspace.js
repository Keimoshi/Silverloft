import { Router } from 'express';
import { parseJson } from '../db.js';

export const workspaceRouter = Router();

function assetDto(row) {
  return {
    id: row.id,
    kind: row.kind,
    alias: row.alias,
    mention: row.mention,
    storageName: row.storage_name,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    sourceResultId: row.source_result_id,
    saved: !!row.saved,
    tags: parseJson(row.tags_json, []),
    meta: parseJson(row.meta_json),
    createdAt: row.created_at,
    url: `/api/assets/${row.id}/file`
  };
}

workspaceRouter.get('/assets', (req, res) => {
  const rows = req.app.locals.db.prepare('SELECT * FROM assets ORDER BY created_at DESC').all();
  res.json(rows.map(assetDto));
});

workspaceRouter.get('/asset-library', (req, res) => {
  const rows = req.app.locals.db.prepare('SELECT * FROM assets WHERE saved=1 ORDER BY created_at DESC').all();
  res.json(rows.map(assetDto));
});

workspaceRouter.get('/templates', (req, res) => {
  const rows = req.app.locals.db.prepare('SELECT * FROM templates ORDER BY category,title').all();
  res.json(rows.map(r => ({
    id:r.id, title:r.title, category:r.category, description:r.description,
    prompt:r.prompt, params:parseJson(r.params_json), createdAt:r.created_at, updatedAt:r.updated_at
  })));
});

workspaceRouter.get('/personas', (req, res) => {
  const rows = req.app.locals.db.prepare('SELECT * FROM personas ORDER BY name').all();
  res.json(rows.map(r => ({
    id:r.id, name:r.name, mention:r.mention, role:r.role, description:r.description,
    baseAssetId:r.base_asset_id, params:parseJson(r.params_json), createdAt:r.created_at, updatedAt:r.updated_at
  })));
});

workspaceRouter.get('/jobs', (req, res) => {
  const rows = req.app.locals.db.prepare('SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100').all();
  res.json(rows.map(r => ({
    id:r.id, conversationId:r.conversation_id, messageId:r.message_id, providerId:r.provider_id,
    kind:r.kind, status:r.status, request:parseJson(r.request_json), result:parseJson(r.result_json),
    error:r.error, createdAt:r.created_at, updatedAt:r.updated_at
  })));
});
