from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class Segment:
    start: float
    end: float
    text: str


@dataclass
class Keyframe:
    index: int
    time: float
    path: str  # absolute path
    rel_path: str  # relative to note dir
    ocr_text: str = ""


@dataclass
class PipelineResult:
    title: str
    source_url: str | None
    duration: float
    video_path: str
    transcript_source: str  # subtitle | asr
    segments: list[Segment] = field(default_factory=list)
    keyframes: list[Keyframe] = field(default_factory=list)
    notes_dir: str = ""
    meta: dict[str, Any] = field(default_factory=dict)


def slugify(text: str, max_len: int = 60) -> str:
    text = text.strip()
    text = re.sub(r"[\\/:*?\"<>|]+", "_", text)
    text = re.sub(r"\s+", "_", text)
    return (text[:max_len] or "untitled").strip("_")


def format_ts(seconds: float) -> str:
    seconds = max(0, int(seconds))
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def format_filename_ts(seconds: float) -> str:
    seconds = max(0, int(seconds))
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    if h:
        return f"{h:02d}h{m:02d}m{s:02d}s"
    return f"{m:02d}m{s:02d}s"


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path
