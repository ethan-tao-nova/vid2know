from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path


def _format_ts(seconds: float) -> str:
    seconds = max(0, int(seconds))
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


@dataclass
class NoteScene:
    time: float
    rel_path: str = ""
    text: str = ""
    ocr_text: str = ""

    @property
    def ts_key(self) -> str:
        return str(int(round(self.time)))


def save_scenes_to_notes_dir(notes_dir: str | Path, scenes: list[NoteScene]) -> Path:
    path = Path(notes_dir) / "scenes.json"
    payload = [asdict(s) for s in scenes]
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def load_scenes_from_notes_dir(notes_dir: str | Path) -> list[NoteScene]:
    """Load scenes from ``scenes.json`` (written during assembly).

    Falls back to reading keyframe metadata from ``meta.json`` when ``scenes.json`` is
    absent, and returns an empty list when neither exists.
    """
    base = Path(notes_dir)
    scenes_path = base / "scenes.json"
    if scenes_path.exists():
        try:
            raw = json.loads(scenes_path.read_text(encoding="utf-8")) or []
        except json.JSONDecodeError:
            raw = []
        out: list[NoteScene] = []
        for item in raw:
            out.append(
                NoteScene(
                    time=float(item.get("time") or 0.0),
                    rel_path=item.get("rel_path") or "",
                    text=item.get("text") or "",
                    ocr_text=item.get("ocr_text") or "",
                )
            )
        return out

    meta_path = base / "meta.json"
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8")) or {}
        except json.JSONDecodeError:
            meta = {}
        out = []
        for item in meta.get("keyframes") or []:
            out.append(
                NoteScene(
                    time=float(item.get("time") or 0.0),
                    rel_path=item.get("rel_path") or "",
                    text=item.get("text") or "",
                    ocr_text=item.get("ocr_text") or "",
                )
            )
        return out
    return []


def scenes_to_context_block(scenes: list[NoteScene], *, max_chars: int = 8000) -> str:
    """Render scenes into a context block carrying ``<!--scene:ts-->`` markers.

    The markers let the model reference specific frames; downstream rendering replaces
    them with the corresponding image.
    """
    lines: list[str] = ["## 关键帧场景 (Scenes)"]
    for sc in scenes:
        lines.append(f"<!--scene:{sc.ts_key}--> [{_format_ts(sc.time)}]")
        if sc.text:
            lines.append(sc.text)
        if sc.ocr_text:
            lines.append(f"OCR: {sc.ocr_text}")
        lines.append("")
    return "\n".join(lines)[:max_chars]


def build_illustrated_document(
    title: str,
    ai_body: str,
    scenes: list[NoteScene] | None = None,
    *,
    header_note: str | None = None,
) -> str:
    """Wrap an AI body with a title and insert images for ``<!--scene:ts-->`` markers.

    When the body contains ``<!--scene:ts-->`` markers they are replaced with the image
    for the closest scene at that timestamp. When it contains none, the available scene
    images are appended as an illustrated gallery so the note is never image-less.
    """
    scenes = scenes or []
    by_ts: dict[str, NoteScene] = {s.ts_key: s for s in scenes}

    body = ai_body or ""
    inserted_any = False

    def _replace(marker_ts: str) -> str:
        nonlocal inserted_any
        sc = by_ts.get(marker_ts) or _closest_scene(scenes, marker_ts)
        if sc and sc.rel_path:
            inserted_any = True
            return f"\n\n![scene {_format_ts(sc.time)}]({sc.rel_path})\n\n"
        return ""

    import re

    body = re.sub(
        r"<!--\s*scene:(\d+)\s*-->",
        lambda m: _replace(m.group(1)),
        body,
    )

    parts: list[str] = [f"# {title}", ""]
    if header_note:
        parts.append(f"> {header_note}")
        parts.append("")
    parts.append(body.strip())

    if not inserted_any and scenes:
        parts.append("")
        parts.append("## 配图 (Illustrations)")
        parts.append("")
        for sc in scenes:
            if sc.rel_path:
                parts.append(f"### [{_format_ts(sc.time)}]")
                parts.append("")
                parts.append(f"![scene]({sc.rel_path})")
                parts.append("")

    return "\n".join(parts).rstrip() + "\n"


def _closest_scene(scenes: list[NoteScene], marker_ts: str) -> "NoteScene | None":
    if not scenes:
        return None
    try:
        target = float(marker_ts)
    except ValueError:
        return None
    return min(scenes, key=lambda s: abs(s.time - target))
