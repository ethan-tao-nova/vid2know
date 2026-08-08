# 影知 Vid2Know

把公开视频网址一键转为高保真 **Markdown 笔记包**：字幕/语音转写、场景关键帧图片、OCR 文字，以及可配置的多模型 AI 并行分析。

> 工程边界：ASR/OCR 无法做到「与原视频零误差」；不绕过登录墙、付费墙或 DRM。解析失败时可上传本地视频兜底。B 站字幕通常需要登录 Cookie。

## 功能

- 输入视频 URL（B 站 / YouTube 等，底层 `yt-dlp`）或上传本地视频
- 优先官方字幕，无字幕则 `faster-whisper` 转写
- 场景检测抽关键帧，图片保存到可配置本地目录
- PaddleOCR 提取画面文字
- Cherry Studio 风格 Provider Hub：OpenAI Compatible / Claude / Gemini，随意切换，多模型并行分析
- Web（Docker）+ Electron 桌面壳

## 快速开始（Docker）

前置：Docker Desktop / Docker Engine + Compose。

> 默认镜像前缀使用 `docker.m.daocloud.io`（便于国内拉取）。若你所在网络可直连 Docker Hub，可自行改回官方镜像名。

```bash
git clone https://github.com/<you>/vid2know.git
cd vid2know

# Windows PowerShell
.\scripts\bootstrap.ps1

# macOS / Linux
chmod +x scripts/bootstrap.sh && ./scripts/bootstrap.sh
```

或手动：

```bash
cp config/.env.example .env
cp config/providers.example.yaml config/providers.yaml
# 编辑 .env 与 providers.yaml（填入至少一个 API Key，可选）
docker compose --env-file .env -f deploy/docker-compose.yml up -d --build
```

浏览器打开：**http://localhost:8080**（若 `.env` 中改了 `APP_PORT` 则用对应端口）

> 注意：必须加 `--env-file .env`，因为 Compose 文件在 `deploy/` 下，默认不会读取仓库根目录的 `.env`。

笔记默认写到仓库内 `data/notes/`（可在设置页或 `.env` 的挂载路径调整）。

## 配置 AI

编辑 `config/providers.yaml`（由示例复制而来），或在 Web「AI 模型」页启用并填写 Key：

```yaml
providers:
  - id: deepseek
    name: DeepSeek
    type: openai_compatible
    enabled: true
    base_url: https://api.deepseek.com/v1
    api_key: sk-xxx
    default_model: deepseek-chat
```

支持类型：

| type | 说明 |
| --- | --- |
| `openai_compatible` | OpenAI、DeepSeek、硅基流动、Groq、Ollama 等 |
| `anthropic` | Claude Messages API |
| `gemini` | Google Generative Language API |

## Electron 桌面端

先启动 Docker 服务，再：

```bash
cd apps/desktop
npm install
# 若网关端口不是 8080（例如本机占用），指定 URL：
# PowerShell: $env:VID2KNOW_URL="http://127.0.0.1:18080"
npm start
```

默认打开 `http://127.0.0.1:8080`。`apps/desktop/.npmrc` 已配置国内 Electron 镜像。

桌面端设置页可浏览本机「笔记目录」与 Cookie 文件。注意：Docker 模式下容器只能写入已挂载卷；若选择宿主机其它盘符路径，请自行把该路径挂进 `deploy/docker-compose.yml` 的 `api`/`worker` volumes。

## 输出结构

```text
{notes_root}/{YYYYMMDD}_{title}_{id}/
  note.md
  transcript.md
  meta.json
  images/
  analysis/
```

## 开发（本地）

```bash
# API
cd services/api
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Worker（另开终端，需 Redis/Postgres）
cd services/worker
pip install -r requirements.txt
celery -A worker.tasks.celery_app worker -l INFO

# Web
cd apps/web
npm install
npm run dev
```

## 文档

- [架构说明](docs/ARCHITECTURE.md)
- [配置说明](docs/CONFIG.md)
- [GitHub 发布](docs/GITHUB.md)

## 合规

仅处理你有权访问的内容。下载缓存仅用于转写，可定期清理 `data/cache/`。请遵守各视频平台服务条款与版权法规。

## License

MIT
