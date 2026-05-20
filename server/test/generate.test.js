import request from 'supertest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

function app(options = {}) { return createApp({ dbPath: ':memory:', ...options }); }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PROJECT_GPT2IMAGE_PATH = path.join(ROOT, 'skills', 'gpt2image.py');

describe('generate', () => {
  it('creates message job and real gpt2image result for known mention', async () => {
    const scriptCalls = [];
    const a = app({
      scriptRunner: async ({ scriptPath, args, outputPath }) => {
        scriptCalls.push({ scriptPath, args, outputPath });
        await import('node:fs').then(({ default: fs }) => fs.writeFileSync(outputPath, Buffer.from('png')));
      }
    });
    await request(a).post('/api/assets/upload').field('conversationId','conv_default').field('kind','image').attach('file', Buffer.from('fake'), 'a.png').expect(200);
    const res = await request(a).post('/api/generate').send({
      conversationId:'conv_default',
      providerId:'gpt-image-2',
      kind:'image',
      prompt:'参考 @图片1 生成直播封面',
      params:{ratio:'9:16', size:'1024x1792', quality:'medium', n:2, endpoint:'http://127.0.0.1:8080/v1/images/edits'},
      mentions:['@图片1']
    }).expect(200);
    expect(res.body.job.status).toBe('succeeded');
    expect(scriptCalls).toHaveLength(1);
    expect(scriptCalls[0].scriptPath).toBe(PROJECT_GPT2IMAGE_PATH);
    expect(scriptCalls[0].args).toContain('参考 @图片1 生成直播封面');
    expect(scriptCalls[0].args).toEqual(expect.arrayContaining(['--output', scriptCalls[0].outputPath, '--size', '1024x1792', '--quality', 'medium', '--n', '2', '--endpoint', 'http://127.0.0.1:8080/v1/images/edits', '--image']));
    expect(scriptCalls[0].args.at(-1)).toMatch(/image_001\.png$/);
    expect(res.body.results[0].downloadUrl).toMatch(/\/api\/results\//);
    expect(res.body.results[0].meta.mock).not.toBe(true);
    expect(res.body.results[0].meta.scriptPath).toBe(PROJECT_GPT2IMAGE_PATH);
    await request(a).get(res.body.results[0].downloadUrl).expect(200);
    const msgs = await request(a).get('/api/conversations/conv_default/messages').expect(200);
    expect(msgs.body.messages.length).toBe(1);
    expect(msgs.body.messages[0].results.length).toBe(1);
  });
  it('rejects unknown mention', async () => {
    await request(app()).post('/api/generate').send({ prompt:'参考 @图片9 生成', mentions:['@图片9'] }).expect(400);
  });
});
