import { EventEmitter } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const GPT2IMAGE_SCRIPT_PATH = path.join(
  '<repo-root>',
  'skills',
  'gpt2image.py',
);

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52,
]);

const ENV_KEYS = [
  'HOME',
  'OD_DATA_DIR',
  'OD_MEDIA_CONFIG_DIR',
  'OD_MEDIA_ALLOW_STUBS',
  'OD_OPENAI_API_KEY',
  'OPENAI_API_KEY',
  'AZURE_API_KEY',
  'AZURE_OPENAI_API_KEY',
];

type SpawnCall = {
  command: string;
  args: string[];
  options: { env?: NodeJS.ProcessEnv };
};

describe('OpenAI image media generation', () => {
  let homeDir: string;
  let projectRoot: string;
  let projectsRoot: string;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(async () => {
    vi.resetModules();
    originalEnv = Object.fromEntries(
      ENV_KEYS.map((key) => [key, process.env[key]]),
    );
    homeDir = await mkdtemp(path.join(tmpdir(), 'od-gpt2image-home-'));
    projectRoot = await mkdtemp(path.join(tmpdir(), 'od-gpt2image-root-'));
    projectsRoot = await mkdtemp(path.join(tmpdir(), 'od-gpt2image-projects-'));

    process.env.HOME = homeDir;
    for (const key of ENV_KEYS) {
      if (key !== 'HOME') delete process.env[key];
    }

    await mkdir(path.join(projectRoot, '.od'), { recursive: true });
    await writeFile(
      path.join(projectRoot, '.od', 'media-config.json'),
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

  afterEach(async () => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] == null) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
    await rm(homeDir, { recursive: true, force: true });
    await rm(projectRoot, { recursive: true, force: true });
    await rm(projectsRoot, { recursive: true, force: true });
  });

  function installSuccessfulScriptMock(spawnCalls: SpawnCall[]) {
    vi.doMock('node:child_process', async (importActual) => {
      const actual =
        await importActual<typeof import('node:child_process')>();
      return {
        ...actual,
        spawn: vi.fn(
          (
            command: string,
            args: string[],
            options: { env?: NodeJS.ProcessEnv },
          ) => {
            spawnCalls.push({ command, args, options });
            const child = new EventEmitter() as EventEmitter & {
              stdout: EventEmitter;
              stderr: EventEmitter;
              kill: ReturnType<typeof vi.fn>;
            };
            child.stdout = new EventEmitter();
            child.stderr = new EventEmitter();
            child.kill = vi.fn();

            const outputIndex = args.indexOf('--output');
            const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : '';
            queueMicrotask(() => {
              void (async () => {
                try {
                  if (outputPath) await writeFile(outputPath, PNG_BYTES);
                  child.stdout.emit('data', Buffer.from('ok\n'));
                  child.emit('close', 0, null);
                } catch (err) {
                  child.emit('error', err);
                }
              })();
            });
            return child;
          },
        ),
      };
    });
  }

  it('routes OpenAI image generation through the project gpt2image script', async () => {
    const projectId = 'scripted-image';
    const projectDir = path.join(projectsRoot, projectId);
    const referencePath = path.join(projectDir, 'reference.png');
    await mkdir(projectDir, { recursive: true });
    await writeFile(referencePath, PNG_BYTES);

    const spawnCalls: SpawnCall[] = [];
    installSuccessfulScriptMock(spawnCalls);
    const fetchMock = vi.fn(async () => {
      throw new Error('direct OpenAI fetch should not be used');
    });
    vi.stubGlobal('fetch', fetchMock);

    const { generateMedia } = await import('../src/media.js');
    const file = await generateMedia({
      projectRoot,
      projectsRoot,
      projectId,
      surface: 'image',
      model: 'gpt-image-2',
      prompt: '生成一张银色阁楼概念图',
      output: 'poster.png',
      aspect: '9:16',
      image: 'reference.png',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(spawnCalls).toHaveLength(1);
    const call = spawnCalls[0]!;
    expect(call.command).toBe('python3');
    expect(call.args[0]).toBe(GPT2IMAGE_SCRIPT_PATH);
    expect(call.args).toContain('生成一张银色阁楼概念图');
    expect(call.args).toContain('--output');
    expect(call.args).toContain('--size');
    expect(call.args[call.args.indexOf('--size') + 1]).toBe('1024x1792');
    expect(call.args).toContain('--quality');
    expect(call.args[call.args.indexOf('--quality') + 1]).toBe('high');
    expect(call.args).toContain('--endpoint');
    expect(call.args[call.args.indexOf('--endpoint') + 1]).toBe(
      'https://proxy.example.test/v1/images/edits',
    );
    expect(call.args).toContain('--image');
    expect(call.args[call.args.indexOf('--image') + 1]).toBe(referencePath);
    expect(call.options.env?.GPT2IMAGE_API_KEY).toBe('stored-openai-secret');

    expect(file).toMatchObject({
      name: 'poster.png',
      size: PNG_BYTES.length,
      kind: 'image',
      mime: 'image/png',
      model: 'gpt-image-2',
      surface: 'image',
      providerId: 'openai',
    });
    expect(file.providerNote).toContain('gpt2image/gpt-image-2');
    await expect(readFile(path.join(projectDir, 'poster.png'))).resolves.toEqual(
      PNG_BYTES,
    );
  });
});
