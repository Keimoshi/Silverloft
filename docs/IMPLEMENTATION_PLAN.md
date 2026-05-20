# Illusory Console Web Implementation Plan

> **For Hermes:** Implement this plan task-by-task with TDD where practical. This project is a new Node/Express + Vite/React app under `<repo-root>`.

**Goal:** Build an interactive conversational AI asset creation web app with a backend-compatible API, SQLite persistence, configurable model/script adapters, upload renaming, @素材引用, result history, and resource/download provider hooks.

**Architecture:** A single project containing an Express API server and a Vite React frontend. SQLite stores configs, assets, conversations, messages, jobs, and results. Backend initially uses mock adapters for safe interactive development, but schema and adapter registry are designed to call project-local scripts later: `skills/gpt2image.py`, `skills/seedance_video.py`, and a configurable resource downloader endpoint.

**Tech Stack:** Node 20, Express, SQLite via `better-sqlite3`, Multer uploads, Vite, React, TypeScript, Vitest, Supertest.

---

## Data Model

SQLite database path:

```text
<repo-root>/data/illusory-console.sqlite
```

Tables:

### `settings`

```sql
key TEXT PRIMARY KEY,
value_json TEXT NOT NULL,
updated_at TEXT NOT NULL
```

### `providers`

```sql
id TEXT PRIMARY KEY,
kind TEXT NOT NULL,              -- image | video | resource
name TEXT NOT NULL,
adapter_type TEXT NOT NULL,      -- script | res-downloader | mock
script_path TEXT,
endpoint TEXT,
api_key_ref TEXT,
model TEXT,
defaults_json TEXT NOT NULL,
form_schema_json TEXT NOT NULL,
enabled INTEGER NOT NULL DEFAULT 1,
created_at TEXT NOT NULL,
updated_at TEXT NOT NULL
```

### `conversations`

```sql
id TEXT PRIMARY KEY,
title TEXT NOT NULL,
created_at TEXT NOT NULL,
updated_at TEXT NOT NULL
```

### `assets`

```sql
id TEXT PRIMARY KEY,
conversation_id TEXT,
kind TEXT NOT NULL,              -- image | video | audio | template | avatar
alias TEXT NOT NULL,             -- 图片1 / 视频1 / 音频1 / 模板1
mention TEXT NOT NULL,           -- @图片1
storage_name TEXT NOT NULL,      -- image_001.png
original_name TEXT,
mime_type TEXT,
size_bytes INTEGER,
path TEXT NOT NULL,
thumbnail_path TEXT,
meta_json TEXT NOT NULL,
created_at TEXT NOT NULL
```

### `messages`

```sql
id TEXT PRIMARY KEY,
conversation_id TEXT NOT NULL,
role TEXT NOT NULL,              -- user | assistant | system
prompt TEXT NOT NULL,
mentions_json TEXT NOT NULL,     -- [{mention:'@图片1', assetId:'...'}]
params_json TEXT NOT NULL,
created_at TEXT NOT NULL
```

### `jobs`

```sql
id TEXT PRIMARY KEY,
conversation_id TEXT NOT NULL,
message_id TEXT,
provider_id TEXT NOT NULL,
kind TEXT NOT NULL,              -- image | video | resource
status TEXT NOT NULL,            -- queued | running | succeeded | failed
request_json TEXT NOT NULL,
result_json TEXT NOT NULL,
error TEXT,
created_at TEXT NOT NULL,
updated_at TEXT NOT NULL
```

### `results`

```sql
id TEXT PRIMARY KEY,
job_id TEXT NOT NULL,
conversation_id TEXT NOT NULL,
kind TEXT NOT NULL,
path TEXT NOT NULL,
thumbnail_path TEXT,
meta_json TEXT NOT NULL,
created_at TEXT NOT NULL
```

---

## API Contract v1

### Health

`GET /api/health`

Response:

```json
{"ok":true,"service":"illusory-console","version":"0.1.0"}
```

### Config / Providers

- `GET /api/config`
- `PATCH /api/config`
- `GET /api/providers`
- `PATCH /api/providers/:id`

### Conversation

- `GET /api/conversations/current`
- `GET /api/conversations/:id/messages`

### Upload Assets

`POST /api/assets/upload`

Multipart fields:

- `conversationId`
- `kind`: image | video | audio
- `file`

Behavior:

- Rename uploaded files by kind and sequence:
  - image → `image_001.ext`, alias `图片1`, mention `@图片1`
  - video → `video_001.ext`, alias `视频1`, mention `@视频1`
  - audio → `audio_001.ext`, alias `音频1`, mention `@音频1`
- Store under:

```text
data/uploads/<conversationId>/<storage_name>
```

Response:

```json
{
  "id":"asset_xxx",
  "kind":"image",
  "alias":"图片1",
  "mention":"@图片1",
  "storageName":"image_001.png",
  "url":"/api/assets/asset_xxx/file"
}
```

### Generate

`POST /api/generate`

Request:

```json
{
  "conversationId":"conv_default",
  "providerId":"gpt-image-2",
  "kind":"image",
  "prompt":"@图片1 作为人物参考，生成直播封面",
  "params":{"ratio":"9:16","resolution":"2K","count":1},
  "mentions":["@图片1"]
}
```

Behavior first version:

- Persist user message.
- Create succeeded mock job/result unless adapter execution is explicitly enabled later.
- Mock result should still be a real local SVG/HTML-friendly placeholder image file under `data/results/...` for download testing.

Response:

```json
{
  "job": {"id":"job_xxx","status":"succeeded"},
  "message": {"id":"msg_xxx"},
  "results": [{"id":"res_xxx","downloadUrl":"/api/results/res_xxx/download"}]
}
```

### Results

- `GET /api/results/:id/download`
- `GET /api/assets/:id/file`

---

## Implementation Tasks

### Task 1: Project Scaffold

**Objective:** Create Node/Vite project structure.

**Files:**
- Create: `package.json`
- Create: `server/package.json` not needed; keep monorepo simple.
- Create: `server/src/app.js`
- Create: `server/src/index.js`
- Create: `client/src/main.jsx`
- Create: `client/src/App.jsx`
- Create: `client/index.html`
- Create: `vite.config.js`

**Verification:**

```bash
npm install
npm run test
npm run build
```

---

### Task 2: Database Layer

**Objective:** Implement SQLite schema initialization and seed default providers.

**Files:**
- Create: `server/src/db.js`
- Create: `server/src/schema.sql`
- Test: `server/test/db.test.js`

**Tests:**

- DB initializes all required tables.
- Seed providers include `gpt-image-2`, `seedance-2`, `res-local`.
- Current conversation is created.

---

### Task 3: Asset Upload API

**Objective:** Upload files, rename sequentially, create `图片N/@图片N` aliases.

**Files:**
- Create: `server/src/routes/assets.js`
- Create: `server/src/lib/assetNaming.js`
- Test: `server/test/assets.test.js`

**Tests:**

- First image upload becomes `image_001.ext`, alias `图片1`, mention `@图片1`.
- Second image upload becomes `image_002.ext`.
- Video upload becomes `video_001.ext`, alias `视频1`.
- File URL returns uploaded bytes.

---

### Task 4: Generate API with Mock Adapter

**Objective:** Persist user message, mentions, params, job, result placeholder.

**Files:**
- Create: `server/src/routes/generate.js`
- Create: `server/src/adapters/mockAdapter.js`
- Create: `server/src/lib/mentions.js`
- Test: `server/test/generate.test.js`

**Tests:**

- `@图片1` resolves to uploaded asset.
- Generate creates message, succeeded job, result.
- Result download works.
- Unknown mention returns 400.

---

### Task 5: Frontend Conversational UI

**Objective:** Replace static prototype with interactive React app.

**Files:**
- Create/Modify: `client/src/App.jsx`
- Create: `client/src/api.js`
- Create: `client/src/styles.css`
- Create: `client/src/components/Composer.jsx`
- Create: `client/src/components/HistoryFeed.jsx`
- Create: `client/src/components/LibraryPanel.jsx`

**Behavior:**

- Display conversation history.
- Upload files and show `@图片N` assets.
- Typing `@` shows mention popup with thumbnail and alias.
- Generate button calls `/api/generate`.
- New result appears in feed.
- Download button links to result download.

---

### Task 6: Config / Provider UI Skeleton

**Objective:** Provide settings-compatible data model and UI entry.

**Files:**
- Create: `server/src/routes/config.js`
- Create: `client/src/components/SettingsPanel.jsx`
- Test: `server/test/config.test.js`

---

### Task 7: Verification

**Objective:** Run tests, build, launch server, check with browser.

Commands:

```bash
npm test
npm run build
npm run dev
```

Manual checks:

- Upload image.
- See `@图片1` in asset list.
- Type `@`, see popup.
- Generate mock result.
- Download result.
- Resize to mobile width, layout stacks.
