from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from worker.pipeline.types import Keyframe, PipelineResult, Segment, format_ts


def _segments_near(segments: list[Segment], t: float, window: float = 8.0) -> list[Segment]:
    return [s for s in segments if s.start <= t + window and s.end >= t - window]


def write_transcript_md(path: Path, segments: list[Segment]) -> None:
    lines = ["# Transcript", ""]
    for seg in segments:
        lines.append(f"**[{format_ts(seg.start)} – {format_ts(seg.end)}]** {seg.text}")
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def write_note_md(result: PipelineResult, analysis_links: list[tuple[str, str]] | None = None) -> Path:
    notes = Path(result.notes_dir)
    note_path = notes / "note.md"
    lines: list[str] = [
        f"# {result.title}",
        "",
        f"- 来源: {result.source_url or '本地上传'}",
        f"- 时长: {format_ts(result.duration)}",
        f"- 转写来源: {result.transcript_source}",
        f"- 生成时间: {datetime.now().isoformat(timespec='seconds')}",
        "",
        "## 时间线笔记",
        "",
    ]

    if result.keyframes:
        for fr in result.keyframes:
            lines.append(f"### [{format_ts(fr.time)}]")
            lines.append("")
            lines.append(f"![scene]({fr.rel_path})")
            lines.append("")
            near = _segments_near(result.segments, fr.time)
            if near:
                for seg in near:
                    lines.append(f"- **[{format_ts(seg.start)}]** {seg.text}")
                lines.append("")
            if fr.ocr_text:
                lines.append("**OCR:**")
                lines.append("")
                lines.append("```")
                lines.append(fr.ocr_text)
                lines.append("```")
                lines.append("")
    else:
        # text-only timeline
        for seg in result.segments:
            lines.append(f"### [{format_ts(seg.start)}]")
            lines.append("")
            lines.append(seg.text)
            lines.append("")

    lines.append("## 完整转写")
    lines.append("")
    lines.append("详见 [transcript.md](transcript.md)")
    lines.append("")

    if analysis_links:
        lines.append("## AI 分析")
        lines.append("")
        for name, rel in analysis_links:
            lines.append(f"- [{name}]({rel})")
        lines.append("")

    note_path.write_text("\n".join(lines), encoding="utf-8")
    return note_path


def write_meta(result: PipelineResult) -> Path:
    path = Path(result.notes_dir) / "meta.json"
    payload = {
        "title": result.title,
        "source_url": result.source_url,
        "duration": result.duration,
        "transcript_source": result.transcript_source,
        "video_path": result.video_path,
        "keyframe_count": len(result.keyframes),
        "segment_count": len(result.segments),
        **result.meta,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def append_analysis_index(note_path: Path, analysis_links: list[tuple[str, str]]) -> None:
    if not analysis_links:
        return
    text = note_path.read_text(encoding="utf-8")
    if "## AI 分析" in text:
        return
    lines = ["", "## AI 分析", ""]
    for name, rel in analysis_links:
        lines.append(f"- [{name}]({rel})")
    lines.append("")
    note_path.write_text(text.rstrip() + "\n" + "\n".join(lines), encoding="utf-8")
