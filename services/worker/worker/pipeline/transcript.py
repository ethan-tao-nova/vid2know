from __future__ import annotations

import re
from pathlib import Path

from worker.pipeline.types import Segment


_TIME_RE = re.compile(
    r"(?P<h>\d+):(?P<m>\d+):(?P<s>\d+)[,\.](?P<ms>\d+)"
)


def _parse_ts(value: str) -> float:
    m = _TIME_RE.search(value.strip())
    if not m:
        return 0.0
    return (
        int(m.group("h")) * 3600
        + int(m.group("m")) * 60
        + int(m.group("s"))
        + int(m.group("ms")[:3].ljust(3, "0")) / 1000.0
    )


def parse_srt(path: Path) -> list[Segment]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    blocks = re.split(r"\n\s*\n", text.strip())
    segments: list[Segment] = []
    for block in blocks:
        lines = [ln.strip("\ufeff") for ln in block.splitlines() if ln.strip()]
        if len(lines) < 2:
            continue
        # find timing line
        timing = None
        content_start = 1
        for i, ln in enumerate(lines):
            if "-->" in ln:
                timing = ln
                content_start = i + 1
                break
        if not timing:
            continue
        start_s, end_s = [p.strip() for p in timing.split("-->")]
        body = " ".join(lines[content_start:]).strip()
        body = re.sub(r"<[^>]+>", "", body)
        if not body:
            continue
        segments.append(Segment(start=_parse_ts(start_s), end=_parse_ts(end_s), text=body))
    return segments


def parse_vtt(path: Path) -> list[Segment]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    lines = text.splitlines()
    segments: list[Segment] = []
    i = 0
    while i < len(lines):
        ln = lines[i].strip()
        if "-->" in ln:
            start_s, end_s = [p.strip() for p in ln.split("-->")]
            end_s = end_s.split()[0]
            i += 1
            body_lines = []
            while i < len(lines) and lines[i].strip():
                body_lines.append(re.sub(r"<[^>]+>", "", lines[i].strip()))
                i += 1
            body = " ".join(body_lines).strip()
            if body:
                segments.append(Segment(start=_parse_ts(start_s), end=_parse_ts(end_s), text=body))
        i += 1
    return segments


def load_subtitles(paths: list[str]) -> list[Segment]:
    preferred = []
    for p in paths:
        path = Path(p)
        if not path.exists():
            continue
        if path.suffix.lower() == ".srt":
            preferred.append((0, path))
        elif path.suffix.lower() == ".vtt":
            preferred.append((1, path))
    preferred.sort(key=lambda x: x[0])
    for _, path in preferred:
        segs = parse_srt(path) if path.suffix.lower() == ".srt" else parse_vtt(path)
        if segs:
            return segs
    return []


def transcribe_with_whisper(
    video_path: str,
    *,
    model_size: str = "base",
    device: str = "cpu",
    compute_type: str = "int8",
) -> list[Segment]:
    from faster_whisper import WhisperModel

    model = WhisperModel(model_size, device=device, compute_type=compute_type)
    segments_iter, _info = model.transcribe(video_path, vad_filter=True, language=None)
    out: list[Segment] = []
    for seg in segments_iter:
        text = (seg.text or "").strip()
        if not text:
            continue
        out.append(Segment(start=float(seg.start), end=float(seg.end), text=text))
    return out


def get_transcript(
    video_path: str,
    subtitle_paths: list[str],
    *,
    whisper_model: str,
    whisper_device: str,
    whisper_compute_type: str,
) -> tuple[list[Segment], str]:
    segs = load_subtitles(subtitle_paths)
    if segs:
        return segs, "subtitle"
    segs = transcribe_with_whisper(
        video_path,
        model_size=whisper_model,
        device=whisper_device,
        compute_type=whisper_compute_type,
    )
    return segs, "asr"
