import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

function makeApp() {
  return createApp({
    dbPath: ':memory:',
    scriptRunner: async ({ outputPath }) => {
      const { default: fs } = await import('node:fs');
      fs.writeFileSync(outputPath, Buffer.from('png'));
    }
  });
}

describe('dynamic workspace APIs', () => {
  it('serves templates, personas, jobs and assets as navigable collections', async () => {
    const app = makeApp();

    const templates = await request(app).get('/api/templates').expect(200);
    expect(templates.body.length).toBeGreaterThan(1);
    expect(templates.body[0]).toHaveProperty('prompt');

    const personas = await request(app).get('/api/personas').expect(200);
    expect(personas.body.length).toBeGreaterThan(0);
    expect(personas.body[0]).toHaveProperty('mention');

    const jobs = await request(app).get('/api/jobs').expect(200);
    expect(Array.isArray(jobs.body)).toBe(true);

    const assets = await request(app).get('/api/assets').expect(200);
    expect(Array.isArray(assets.body)).toBe(true);
  });

  it('saves generation results to asset library and supports resource jobs', async () => {
    const app = makeApp();
    const gen = await request(app).post('/api/generate').send({
      conversationId: 'conv_default',
      providerId: 'gpt-image-2',
      kind: 'image',
      prompt: '生成测试图',
      mentions: [],
      params: { ratio: '9:16' }
    }).expect(200);

    const resultId = gen.body.results[0].id;
    const saved = await request(app).post(`/api/results/${resultId}/save-to-assets`).send({ name: '测试资产' }).expect(200);
    expect(saved.body.alias).toMatch(/^资产/);
    expect(saved.body.sourceResultId).toBe(resultId);

    const resource = await request(app).post('/api/resources/download').send({ url: 'https://example.com/demo.mp4', platform: 'douyin' }).expect(200);
    expect(resource.body.job.status).toBe('succeeded');
    expect(resource.body.result.kind).toBe('resource');
  });

  it('updates provider settings from the settings panel', async () => {
    const app = makeApp();
    const res = await request(app).patch('/api/providers/gpt-image-2').send({
      endpoint: 'http://127.0.0.1:8080/v1/images/edits',
      model: 'gpt-image-2-test'
    }).expect(200);
    expect(res.body.endpoint).toBe('http://127.0.0.1:8080/v1/images/edits');
    expect(res.body.model).toBe('gpt-image-2-test');
  });
});
