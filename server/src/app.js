import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from './db.js';
import { configRouter } from './routes/config.js';
import { assetsRouter } from './routes/assets.js';
import { conversationsRouter } from './routes/conversations.js';
import { generateRouter } from './routes/generate.js';
import { resourcesRouter } from './routes/resources.js';
import { workspaceRouter } from './routes/workspace.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp({ dbPath, scriptRunner } = {}) {
  const db = initDb(dbPath);
  const app = express();
  app.locals.db = db;
  app.locals.scriptRunner = scriptRunner;
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.get('/api/health', (req, res) => res.json({ ok: true, service: 'illusory-console', version: '0.1.0' }));
  app.use('/api', configRouter);
  app.use('/api/assets', assetsRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api', generateRouter);
  app.use('/api/resources', resourcesRouter);
  app.use('/api', workspaceRouter);
  const dist = path.resolve(__dirname, '../../dist');
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(dist, 'index.html'), (err) => err && next());
  });
  return app;
}
