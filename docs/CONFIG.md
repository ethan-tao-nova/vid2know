# Configuration

## `.env`

Copy from `config/.env.example` to project root `.env`.

| Variable | Meaning |
| --- | --- |
| `APP_PORT` | Host port for Web gateway (default `8080`) |
| `DATABASE_URL` | SQLAlchemy URL for Postgres |
| `REDIS_URL` / `CELERY_*` | Queue |
| `NOTES_ROOT` | Inside container note root (`/data/notes`) |
| `COOKIES_FILE` | Optional Netscape cookies path inside container |
| `WHISPER_MODEL` | `tiny` / `base` / `small` / … |
| `OCR_ENABLED` | `true` / `false` |
| `SCENE_THRESHOLD` | PySceneDetect content threshold |
| `MAX_KEYFRAMES` | Cap on extracted frames |

## `config/providers.yaml`

Copy from `config/providers.example.yaml`. Never commit real keys.

```yaml
providers:
  - id: deepseek
    name: DeepSeek
    type: openai_compatible
    enabled: true
    base_url: https://api.deepseek.com/v1
    api_key: sk-xxx
    default_model: deepseek-chat
    temperature: 0.3
    timeout_seconds: 120
```

You can also edit providers in the Web UI; values are stored in Postgres and override the file for the same `id`.

## Bilibili cookies

1. Export `cookies.txt` (browser extension or `yt-dlp --cookies-from-browser` dump).
2. Place file under `config/cookies.txt` (gitignored) or any mounted path.
3. Set `COOKIES_FILE=/config/cookies.txt` in `.env`, or set the path in Settings.

## Changing host note directory

Default bind mount: `./data/notes:/data/notes`.

To use another host folder, edit `deploy/docker-compose.yml` volumes for `api` and `worker`, for example:

```yaml
- E:/MyNotes:/data/notes
```

Keep `NOTES_ROOT=/data/notes` inside the container (or update Settings to match the in-container path).

## Temporary video download directory

Default: `./data/cache:/data/cache` → Settings `video_cache_root=/data/cache`.

Analysis finishes with `auto_delete_video=true` (default): temporary video files under the cache dir are removed; Markdown notes and keyframe images are kept.

## Bilibili 412

If download fails with HTTP 412:

1. Login to bilibili.com in a browser
2. Export Netscape `cookies.txt`
3. Save as `config/cookies.txt`
4. Set Settings `cookies_file` to `/config/cookies.txt` (or `COOKIES_FILE=/config/cookies.txt` in `.env`)
5. Retry the task
