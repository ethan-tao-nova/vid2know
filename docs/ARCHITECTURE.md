# Architecture

## Components

| Component | Path | Role |
| --- | --- | --- |
| Web UI | `apps/web` | React + Vite + Ant Design |
| Desktop | `apps/desktop` | Electron shell over the same Web UI |
| API | `services/api` | FastAPI: tasks, settings, providers, health |
| Worker | `services/worker` | Celery: download → transcript → frames → OCR → MD → AI |
| Gateway | `deploy/nginx.conf` | Reverse proxy `:8080` → web + api |

## Data flow

1. User submits URL or upload via Web/Electron.
2. API creates a `tasks` row and enqueues `worker.tasks.process_video_task`.
3. Worker downloads with yt-dlp (optional cookies), prefers soft subtitles, else Whisper ASR.
4. PySceneDetect + FFmpeg extract keyframes into `images/`.
5. PaddleOCR annotates frames (skipped if engine unavailable).
6. Assembler writes `note.md`, `transcript.md`, `meta.json`.
7. Selected AI providers run **in parallel** (thread pool) and write `analysis/*.md`.

## Persistence

- PostgreSQL: tasks, runtime settings, provider overrides
- Redis: Celery broker/result
- Filesystem: notes, uploads, cache (Docker volumes under `data/`)

## Provider Hub

File `config/providers.yaml` is the base catalog. Rows in `provider_configs` override by `id`. Public API never returns raw keys (masked only).
