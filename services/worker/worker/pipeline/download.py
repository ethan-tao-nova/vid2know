from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from worker.pipeline.types import ensure_dir

BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)


def _is_bilibili(url: str) -> bool:
    u = (url or "").lower()
    return "bilibili.com" in u or "b23.tv" in u


def _build_ydl_opts(
    *,
    outtmpl: str,
    cookies_file: str | None,
    url: str,
) -> dict[str, Any]:
    headers = {
        "User-Agent": BROWSER_UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Referer": "https://www.bilibili.com/",
        "Origin": "https://www.bilibili.com",
    }
    ydl_opts: dict[str, Any] = {
        "outtmpl": outtmpl,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["zh-Hans", "zh-CN", "zh", "ai-zh", "en"],
        "subtitlesformat": "srt/best",
        "merge_output_format": "mp4",
        "format": "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b",
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "retries": 5,
        "fragment_retries": 5,
        "extractor_retries": 3,
        "socket_timeout": 30,
        "http_headers": headers,
        # Prefer IPv4; some WAF paths treat Docker IPv6 oddly.
        "source_address": "0.0.0.0",
    }
    if cookies_file and Path(cookies_file).exists():
        ydl_opts["cookiefile"] = cookies_file
    if _is_bilibili(url):
        # Newer bilibili extractor options when available.
        ydl_opts["extractor_args"] = {
            "bilibili": {"prefer_multi_flv": ["false"]},
        }
    return ydl_opts


def _friendly_download_error(url: str, exc: Exception, cookies_file: str | None) -> RuntimeError:
    msg = str(exc)
    if "412" in msg or "Precondition Failed" in msg:
        has_cookie = bool(cookies_file and Path(cookies_file).exists())
        tip = (
            "B 站返回 412（反爬/风控）。请：1) 浏览器登录 bilibili.com；"
            "2) 导出 Netscape 格式 cookies.txt 放到 config/cookies.txt；"
            "3) 在设置里填写 Cookies 路径为 /config/cookies.txt 后重试。"
        )
        if not has_cookie:
            tip += " 当前未检测到有效 Cookie 文件。"
        else:
            tip += " 当前已配置 Cookie，可尝试更新 Cookie 或更换网络后重试。"
        return RuntimeError(f"{tip}\n原始错误: {msg}")
    return RuntimeError(msg)


def download_media(
    *,
    url: str,
    work_dir: Path,
    cookies_file: str | None = None,
) -> dict[str, Any]:
    """Download video + subtitles via yt-dlp. Returns info dict and paths."""
    import yt_dlp
    from yt_dlp.utils import DownloadError

    ensure_dir(work_dir)
    outtmpl = str(work_dir / "%(id)s.%(ext)s")
    ydl_opts = _build_ydl_opts(outtmpl=outtmpl, cookies_file=cookies_file, url=url)

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            info = ydl.sanitize_info(info)
    except DownloadError as exc:
        raise _friendly_download_error(url, exc, cookies_file) from exc

    video_id = info.get("id") or "video"
    candidates = list(work_dir.glob(f"{video_id}.*"))
    media = None
    for ext in (".mp4", ".mkv", ".webm", ".m4a", ".mp3"):
        for c in candidates:
            if c.suffix.lower() == ext:
                media = c
                break
        if media:
            break
    if media is None:
        files = [
            c
            for c in candidates
            if c.suffix.lower() not in {".srt", ".vtt", ".json", ".info"}
            and ".info." not in c.name
        ]
        if not files:
            raise RuntimeError("yt-dlp 完成但未找到媒体文件")
        media = max(files, key=lambda p: p.stat().st_size)

    subs = list(work_dir.glob(f"{video_id}*.srt")) + list(work_dir.glob(f"{video_id}*.vtt"))
    meta_path = work_dir / f"{video_id}.info.json"
    meta_path.write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")

    return {
        "info": info,
        "video_path": str(media),
        "subtitle_paths": [str(s) for s in subs],
        "title": info.get("title") or video_id,
        "duration": float(info.get("duration") or 0),
        "webpage_url": info.get("webpage_url") or url,
    }


def cleanup_media(
    *,
    work_dir: Path | None,
    video_path: str | None,
    source_type: str,
    auto_delete: bool,
) -> dict[str, Any]:
    """Remove temporary video/cache after note generation."""
    if not auto_delete:
        return {"deleted": False, "reason": "auto_delete_disabled"}

    deleted: list[str] = []
    # Always remove download work dir for URL tasks.
    if source_type == "url" and work_dir and work_dir.exists():
        shutil.rmtree(work_dir, ignore_errors=True)
        deleted.append(str(work_dir))
    elif video_path:
        p = Path(video_path)
        if p.exists() and p.is_file():
            p.unlink(missing_ok=True)
            deleted.append(str(p))
            # also clear empty parent task upload folder when safe
            parent = p.parent
            if parent.name and parent.exists():
                try:
                    if not any(parent.iterdir()):
                        parent.rmdir()
                        deleted.append(str(parent))
                except OSError:
                    pass
    return {"deleted": True, "paths": deleted}
