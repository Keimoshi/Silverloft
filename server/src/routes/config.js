import { Router } from 'express';
import { parseJson, json, now } from '../db.js';

export const configRouter = Router();

configRouter.get('/providers', (req, res) => {
  const rows = req.app.locals.db.prepare('SELECT * FROM providers ORDER BY kind, name').all();
  res.json(rows.map(row => ({
    id: row.id, kind: row.kind, name: row.name, adapterType: row.adapter_type,
    scriptPath: row.script_path, endpoint: row.endpoint, apiKeyRef: row.api_key_ref,
    model: row.model, defaults: parseJson(row.defaults_json), formSchema: parseJson(row.form_schema_json), enabled: !!row.enabled
  })));
});

configRouter.patch('/providers/:id', (req, res) => {
  const row = req.app.locals.db.prepare('SELECT * FROM providers WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'provider_not_found' });
  const next = { ...row };
  for (const [key, col] of Object.entries({ name:'name', endpoint:'endpoint', apiKeyRef:'api_key_ref', scriptPath:'script_path', model:'model' })) {
    if (key in req.body) next[col] = req.body[key];
  }
  if ('defaults' in req.body) next.defaults_json = json(req.body.defaults);
  if ('formSchema' in req.body) next.form_schema_json = json(req.body.formSchema);
  next.updated_at = now();
  req.app.locals.db.prepare(`UPDATE providers SET name=@name,endpoint=@endpoint,api_key_ref=@api_key_ref,script_path=@script_path,model=@model,defaults_json=@defaults_json,form_schema_json=@form_schema_json,updated_at=@updated_at WHERE id=@id`).run(next);
  res.json({
    id: next.id, kind: next.kind, name: next.name, adapterType: next.adapter_type,
    scriptPath: next.script_path, endpoint: next.endpoint, apiKeyRef: next.api_key_ref,
    model: next.model, defaults: parseJson(next.defaults_json), formSchema: parseJson(next.form_schema_json), enabled: !!next.enabled
  });
});

configRouter.get('/config', (req, res) => {
  const rows = req.app.locals.db.prepare('SELECT key,value_json FROM settings').all();
  const config = Object.fromEntries(rows.map(r => [r.key, parseJson(r.value_json)]));
  res.json(config);
});

configRouter.patch('/config', (req, res) => {
  const stmt = req.app.locals.db.prepare('INSERT INTO settings (key,value_json,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at');
  for (const [k,v] of Object.entries(req.body || {})) stmt.run(k, json(v), now());
  res.json({ ok: true });
});
