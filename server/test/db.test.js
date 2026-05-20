import request from 'supertest';
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { DEFAULT_SEEDANCE_SCRIPT_PATH, initDb } from '../src/db.js';

function app() { return createApp({ dbPath: ':memory:' }); }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PROJECT_GPT2IMAGE_PATH = path.join(ROOT, 'skills', 'gpt2image.py');

describe('health and providers', () => {
  it('reports health', async () => {
    const res = await request(app()).get('/api/health').expect(200);
    expect(res.body.ok).toBe(true);
  });
  it('seeds default providers', async () => {
    const env = { gpt2image: process.env.GPT2IMAGE_ENDPOINT, ark: process.env.ARK_BASE_URL };
    delete process.env.GPT2IMAGE_ENDPOINT;
    delete process.env.ARK_BASE_URL;
    const res = await request(app()).get('/api/providers').expect(200);
    if (env.gpt2image !== undefined) process.env.GPT2IMAGE_ENDPOINT = env.gpt2image;
    if (env.ark !== undefined) process.env.ARK_BASE_URL = env.ark;
    expect(res.body.map(p => p.id)).toContain('gpt-image-2');
    expect(res.body.map(p => p.id)).toContain('seedance-2');
    expect(res.body.map(p => p.id)).toContain('res-local');
    expect(res.body.find(p => p.id === 'gpt-image-2').scriptPath).toBe(PROJECT_GPT2IMAGE_PATH);
    expect(res.body.find(p => p.id === 'gpt-image-2').endpoint).toBe(null);
    expect(res.body.find(p => p.id === 'seedance-2').scriptPath).toBe(DEFAULT_SEEDANCE_SCRIPT_PATH);
  });
  it('seeds endpoints from environment when provided', () => {
    const env = { gpt2image: process.env.GPT2IMAGE_ENDPOINT, ark: process.env.ARK_BASE_URL };
    process.env.GPT2IMAGE_ENDPOINT = 'https://example.invalid/images/edits';
    process.env.ARK_BASE_URL = 'https://ark.example.invalid/api/v3';

    const db = initDb(':memory:');
    const imageRow = db.prepare('SELECT script_path, endpoint FROM providers WHERE id=?').get('gpt-image-2');
    const videoRow = db.prepare('SELECT script_path, endpoint FROM providers WHERE id=?').get('seedance-2');
    expect(imageRow.script_path).toBe(PROJECT_GPT2IMAGE_PATH);
    expect(imageRow.endpoint).toBe('https://example.invalid/images/edits');
    expect(videoRow.script_path).toBe(DEFAULT_SEEDANCE_SCRIPT_PATH);
    expect(videoRow.endpoint).toBe('https://ark.example.invalid/api/v3');
    db.close();
    if (env.gpt2image === undefined) delete process.env.GPT2IMAGE_ENDPOINT;
    else process.env.GPT2IMAGE_ENDPOINT = env.gpt2image;
    if (env.ark === undefined) delete process.env.ARK_BASE_URL;
    else process.env.ARK_BASE_URL = env.ark;
  });
});
