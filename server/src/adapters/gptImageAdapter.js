import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { nanoid } from 'nanoid';
import { DATA_DIR, DEFAULT_SCRIPT_PATH, json, now, parseJson } from '../db.js';

const execFileAsync = promisify(execFile);

export async function runScript({ scriptPath, args }) {
  return execFileAsync('python3', [scriptPath, ...args], {
    maxBuffer: 1024 * 1024 * 8,
    timeout: 1000 * 60 * 8,
  });
}

export async function createGptImageResult({ db, conversationId, jobId, prompt, params = {}, provider, resolvedMentions = [], scriptRunner = runScript }) {
  const resultId = `res_${nanoid(10)}`;
  const dir = path.join(DATA_DIR, 'results', conversationId);
  fs.mkdirSync(dir, { recursive: true });
  const outputPath = path.join(dir, `${resultId}.png`);
  const scriptPath = provider.script_path || DEFAULT_SCRIPT_PATH;
  const defaults = parseJson(provider.defaults_json, {});
  const merged = { ...defaults, ...params };
  const size = normalizeSize(merged.size || merged.ratio || merged.aspect);
  const quality = normalizeQuality(merged.quality || merged.resolution);
  const n = normalizeCount(merged.n ?? merged.count);
  const imagePaths = resolvedMentions
    .map((item) => item.path)
    .filter((itemPath) => itemPath && isImagePath(itemPath));
  const endpoint = normalizeEndpoint(merged.endpoint || provider.endpoint, imagePaths.length > 0);

  const args = [
    prompt,
    '--output',
    outputPath,
    '--size',
    size,
    '--quality',
    quality,
    '--n',
    String(n),
  ];
  if (endpoint) args.push('--endpoint', endpoint);
  imagePaths.forEach((imagePath) => args.push('--image', imagePath));

  await scriptRunner({ scriptPath, args, outputPath, params: merged, provider });

  const savedOutputs = collectSavedOutputs(outputPath);
  if (savedOutputs.length === 0) {
    throw new Error('gpt_image_output_missing');
  }

  const meta = {
    prompt,
    params: merged,
    scriptPath,
    endpoint,
    size,
    quality,
    n,
    referenceImages: imagePaths,
    savedOutputs,
  };
  const metaPath = `${outputPath}.json`;
  if (fs.existsSync(metaPath)) meta.scriptMeta = parseJson(fs.readFileSync(metaPath, 'utf8'), {});

  const t = now();
  db.prepare('INSERT INTO results (id,job_id,conversation_id,kind,path,thumbnail_path,meta_json,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(resultId, jobId, conversationId, 'image', savedOutputs[0], null, json(meta), t);
  return { id: resultId, kind: 'image', path: savedOutputs[0], fileUrl: `/api/results/${resultId}/file`, downloadUrl: `/api/results/${resultId}/download`, meta };
}

function normalizeSize(value) {
  const raw = String(value || '').trim();
  if (['1024x1024', '1792x1024', '1024x1792'].includes(raw)) return raw;
  if (['16:9', '横屏', 'landscape'].includes(raw)) return '1792x1024';
  if (['9:16', '4:5', '竖屏', 'portrait'].includes(raw)) return '1024x1792';
  return '1024x1024';
}

function normalizeQuality(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (['low', 'medium', 'high'].includes(raw)) return raw;
  if (raw.includes('4k') || raw.includes('2k') || raw.includes('高清') || raw.includes('高')) return 'high';
  if (raw.includes('medium') || raw.includes('中')) return 'medium';
  if (raw.includes('low') || raw.includes('低')) return 'low';
  return 'high';
}

function normalizeCount(value) {
  const n = Number(value || 1);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(Math.trunc(n), 1), 4);
}

function normalizeEndpoint(value, hasReferenceImages) {
  const endpoint = String(value || '').trim();
  if (!endpoint) return undefined;
  if (hasReferenceImages) return endpoint.replace(/\/images\/generations$/, '/images/edits');
  return endpoint.replace(/\/images\/edits$/, '/images/generations');
}

function isImagePath(itemPath) {
  return /\.(png|jpe?g|webp)$/i.test(itemPath || '');
}

function collectSavedOutputs(outputPath) {
  if (fs.existsSync(outputPath)) return [outputPath];
  const parsed = path.parse(outputPath);
  const parent = parsed.dir || '.';
  if (!fs.existsSync(parent)) return [];
  const escapedStem = escapeRegExp(parsed.name);
  const pattern = new RegExp(`^${escapedStem}_\\d{3}${escapeRegExp(parsed.ext)}$`);
  return fs.readdirSync(parent)
    .filter((name) => pattern.test(name))
    .sort()
    .map((name) => path.join(parent, name));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
