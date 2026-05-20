import type http from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { startServer } from '../src/server.js';

type ProviderStatusBody = {
  providers: {
    openai: {
      configured: boolean;
      credentialsRequired: boolean;
      source: string;
      apiKey?: string;
      apiKeyTail?: string;
      baseUrl?: string;
    };
  };
};

type MaskedConfigBody = {
  providers: {
    openai: {
      configured: boolean;
      source: string;
      apiKeyTail: string;
      baseUrl: string;
      apiKey?: string;
    };
  };
};

describe('admin media provider config routes', () => {
  let server: http.Server;
  let baseUrl: string;
  let dataDir: string;
  let originalDataDir: string | undefined;
  let originalMediaConfigDir: string | undefined;
  let originalAdminToken: string | undefined;

  beforeAll(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), 'od-admin-media-'));
    originalDataDir = process.env.OD_DATA_DIR;
    originalMediaConfigDir = process.env.OD_MEDIA_CONFIG_DIR;
    originalAdminToken = process.env.OD_ADMIN_TOKEN;
    process.env.OD_DATA_DIR = dataDir;
    process.env.OD_MEDIA_CONFIG_DIR = dataDir;
    process.env.OD_ADMIN_TOKEN = 'admin-test-token';

    await mkdir(dataDir, { recursive: true });
    await writeFile(
      path.join(dataDir, 'media-config.json'),
      JSON.stringify({
        providers: {
          openai: {
            apiKey: 'stored-openai-secret',
            baseUrl: 'https://proxy.example.test/v1',
          },
        },
      }),
      'utf8',
    );

    const started = (await startServer({ port: 0, returnServer: true })) as {
      url: string;
      server: http.Server;
    };
    baseUrl = started.url;
    server = started.server;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (originalDataDir == null) {
      delete process.env.OD_DATA_DIR;
    } else {
      process.env.OD_DATA_DIR = originalDataDir;
    }
    if (originalMediaConfigDir == null) {
      delete process.env.OD_MEDIA_CONFIG_DIR;
    } else {
      process.env.OD_MEDIA_CONFIG_DIR = originalMediaConfigDir;
    }
    if (originalAdminToken == null) {
      delete process.env.OD_ADMIN_TOKEN;
    } else {
      process.env.OD_ADMIN_TOKEN = originalAdminToken;
    }
    await rm(dataDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    await writeFile(
      path.join(dataDir, 'media-config.json'),
      JSON.stringify({
        providers: {
          openai: {
            apiKey: 'stored-openai-secret',
            baseUrl: 'https://proxy.example.test/v1',
          },
        },
      }),
      'utf8',
    );
  });

  it('serves public provider status without API keys, tails, or base URLs', async () => {
    const res = await fetch(`${baseUrl}/api/providers`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as ProviderStatusBody;
    expect(body.providers.openai).toMatchObject({
      configured: true,
      credentialsRequired: true,
      source: 'stored',
    });
    expect(body.providers.openai).not.toHaveProperty('apiKey');
    expect(body.providers.openai).not.toHaveProperty('apiKeyTail');
    expect(body.providers.openai).not.toHaveProperty('baseUrl');
  });

  it('does not expose provider config on the old public media-config route', async () => {
    const getRes = await fetch(`${baseUrl}/api/media/config`);
    const putRes = await fetch(`${baseUrl}/api/media/config`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ providers: {} }),
    });

    expect(getRes.status).toBe(404);
    expect(putRes.status).toBe(404);
  });

  it('requires the admin token before returning masked config details', async () => {
    const missing = await fetch(`${baseUrl}/api/admin/media/config`);
    const wrong = await fetch(`${baseUrl}/api/admin/media/config`, {
      headers: { 'x-od-admin-token': 'wrong-token' },
    });
    const ok = await fetch(`${baseUrl}/api/admin/media/config`, {
      headers: { 'x-od-admin-token': 'admin-test-token' },
    });

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(403);
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as MaskedConfigBody;
    expect(body.providers.openai).toMatchObject({
      configured: true,
      source: 'stored',
      apiKeyTail: 'cret',
      baseUrl: 'https://proxy.example.test/v1',
    });
    expect(body.providers.openai).not.toHaveProperty('apiKey');
  });

  it('requires the admin token before writing provider config', async () => {
    const forbidden = await fetch(`${baseUrl}/api/admin/media/config`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        providers: {
          openai: { apiKey: 'blocked-key', baseUrl: 'https://blocked.test/v1' },
        },
      }),
    });
    expect(forbidden.status).toBe(401);

    const ok = await fetch(`${baseUrl}/api/admin/media/config`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-od-admin-token': 'admin-test-token',
      },
      body: JSON.stringify({
        providers: {
          openai: { apiKey: 'new-admin-key', baseUrl: 'https://admin.test/v1' },
        },
      }),
    });

    expect(ok.status).toBe(200);
    const onDisk = JSON.parse(
      await readFile(path.join(dataDir, 'media-config.json'), 'utf8'),
    );
    expect(onDisk.providers.openai).toEqual({
      apiKey: 'new-admin-key',
      baseUrl: 'https://admin.test/v1',
    });
  });

  it('preserves an existing API key when admin updates omit apiKey', async () => {
    const ok = await fetch(`${baseUrl}/api/admin/media/config`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-od-admin-token': 'admin-test-token',
      },
      body: JSON.stringify({
        providers: {
          openai: { baseUrl: 'https://base-only.example.test/v1' },
        },
      }),
    });

    expect(ok.status).toBe(200);
    const onDisk = JSON.parse(
      await readFile(path.join(dataDir, 'media-config.json'), 'utf8'),
    );
    expect(onDisk.providers.openai).toEqual({
      apiKey: 'stored-openai-secret',
      baseUrl: 'https://base-only.example.test/v1',
    });
  });

  it('allows admin to explicitly clear the last stored provider', async () => {
    const ok = await fetch(`${baseUrl}/api/admin/media/config`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-od-admin-token': 'admin-test-token',
      },
      body: JSON.stringify({
        providers: {
          openai: { apiKey: '', baseUrl: '' },
        },
      }),
    });

    expect(ok.status).toBe(200);
    const onDisk = JSON.parse(
      await readFile(path.join(dataDir, 'media-config.json'), 'utf8'),
    );
    expect(onDisk.providers).toEqual({});
  });
});
