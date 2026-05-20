# Silverloft Illusory Studio

Illusory Studio is a Vite/React frontend wired to the OpenDesign daemon API for project files, media tasks, and admin media provider configuration.

## Runtime

- Use Node 24. The local verified runtime is `fnm` Node `v24.15.0`.
- Example setup:

```bash
fnm use 24.15.0
npm install
```

## Local Development

Run the OpenDesign daemon first. The frontend expects it on port `7456` by default:

```bash
cd open-design-port
# Start the OpenDesign daemon using that repo's normal command.
# Ensure it listens on 127.0.0.1:7456, or export OD_PORT / OD_DAEMON_URL below.
```

Then start the Illusory Vite frontend from this repo:

```bash
npm run dev
```

Vite proxies these paths to the daemon:

- `/api`
- `/artifacts`
- `/frames`

The default daemon target is `http://127.0.0.1:7456`. Override it with either:

```bash
OD_DAEMON_URL=http://127.0.0.1:8123 npm run dev
# or
OD_PORT=8123 npm run dev
```

`OD_DAEMON_URL` takes precedence over `OD_PORT`.

## Admin

Open `/admin` in the Vite app to manage OpenDesign media provider credentials. Enter the daemon admin token in the page; the UI stores the token only in browser `localStorage` and sends it as the `x-od-admin-token` header. Do not commit or paste real admin tokens into documentation, tests, or reports.

## Public Configuration

All provider keys, provider base URLs, admin tokens, resource endpoints, and machine-specific file paths must stay outside committed source. Use local `.env` files, OpenDesign `/admin`, or deployment secrets.

Start from `.env.example` and replace only in your local environment:

- `OD_ADMIN_TOKEN`: daemon admin token for `/admin`.
- `OD_DAEMON_URL` or `OD_PORT`: local daemon URL/port for Vite proxying.
- `GPT2IMAGE_BASE_URL`, `GPT2IMAGE_ENDPOINT`, `GPT2IMAGE_API_KEY`: image script provider settings.
- `ARK_BASE_URL`, `ARK_API_KEY`: Ark-compatible video/image settings.
- `OD_OPENAI_BASE_URL`, `OD_VOLCENGINE_BASE_URL`, `OD_GROK_BASE_URL`, `OD_MINIMAX_BASE_URL`, `OD_FISHAUDIO_BASE_URL`: OpenDesign integrated provider base URLs.
- `RES_DOWNLOADER_ENDPOINT`: optional local resource downloader.
- `WAITING_ROOM_FIRST_FRAME`, `WAITING_ROOM_OUTPUT`: legacy waiting-room script input/output paths.

When modifying this project for public use:

- Do not hardcode real API keys, bearer tokens, OAuth tokens, admin tokens, or key-like test strings.
- Do not hardcode real model provider endpoint URLs. Use environment variables, Settings `/admin`, or placeholders under `.example.invalid`.
- Do not commit local absolute home-directory paths, Windows profile paths, private IP hosts, or personal directory names. Use `<repo-root>`, relative paths, or documented environment variables.
- Keep `.env`, local SQLite data, OpenDesign `.od/`, reports, and generated artifacts ignored.

## Verification

```bash
fnm use 24.15.0
npm test
npm run build
```

The legacy `server/` directory remains in the repository for existing tests and compatibility, but the Vite frontend is configured to talk to the OpenDesign daemon during local development.
