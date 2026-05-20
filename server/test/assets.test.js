import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

function app() { return createApp({ dbPath: ':memory:' }); }

describe('asset upload', () => {
  it('renames uploaded images to image_001 and image_002 with 图片 aliases', async () => {
    const a = app();
    const one = await request(a).post('/api/assets/upload').field('conversationId','conv_default').field('kind','image').attach('file', Buffer.from('fake1'), 'origin-a.png').expect(200);
    expect(one.body.alias).toBe('图片1');
    expect(one.body.mention).toBe('@图片1');
    expect(one.body.storageName).toBe('image_001.png');
    const two = await request(a).post('/api/assets/upload').field('conversationId','conv_default').field('kind','image').attach('file', Buffer.from('fake2'), 'origin-b.jpg').expect(200);
    expect(two.body.alias).toBe('图片2');
    expect(two.body.storageName).toBe('image_002.jpg');
    await request(a).get(one.body.url).expect(200);
  });
  it('renames uploaded videos as 视频1', async () => {
    const res = await request(app()).post('/api/assets/upload').field('kind','video').attach('file', Buffer.from('mp4'), 'dance.mp4').expect(200);
    expect(res.body.alias).toBe('视频1');
    expect(res.body.mention).toBe('@视频1');
    expect(res.body.storageName).toBe('video_001.mp4');
  });
});
