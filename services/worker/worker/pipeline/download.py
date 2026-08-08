from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from worker.pipeline.types import ensure_dir


def download_media(
    *,
    url: str,
    work_dir: Path,
    cookies_file: str | None = None,
) -> dict[str, Any]:
    """Download video + subtitles via yt-dlp. Returns info dict and paths."""
    import yt_dlp

    ensure_dir(work_dir)
    outtmpl = str(work_dir / "%(id)s.%(ext)s")
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
    }
    if cookies_file and Path(cookies_file).exists():
        ydl_opts["cookiefile"] = cookies_file

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        info = ydl.sanitize_info(info)

    video_id = info.get("id") or "video"
    # find downloaded media
    candidates = list(work_dir.glob(f"{video_id}.*"))
    media = None
    for ext in (".mp4", ".mkv", ".webm", ".m4a", ".mp3"):
        for c in candidates:
            if c.suffix.lower() == ext and c.suffix.lower() not in (".srt", ".vtt", ".json"):
                media = c
                break
        if media:
            break
    if media is None:
        # fallback: largest non-subtitle file
        files = [c for c in candidates if c.suffix.lower() not in {".srt", ".vtt", ".json", ".info"}]
        if not files:
            raise RuntimeError("yt-dlp finished but no media file found")
        media = max(files, key=lambda p: p.stat().st_size)

    subs = [c for c in work_dir.glob(f"{video_id}*.srt")] + [c for c in work_dir.glob(f"{video_id}*.vtt")]
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
