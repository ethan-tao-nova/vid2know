from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

from worker.pipeline.types import Keyframe, Segment, ensure_dir


class TaskCancelled(Exception):
    """Raised when a task has been asked to cancel via task.meta.cancel_requested."""


# Ordered pipeline stages. Resuming ``from_stage`` runs this stage and everything
# after it, while earlier stages are loaded from the on-disk checkpoint.
STAGE_ORDER: list[str] = [
    "downloading",
    "transcribing",
    "extracting_frames",
    "ocr",
    "assembling",
    "analyzing",
]


def stage_index(stage: str | None) -> int:
    if not stage:
        return 0
    try:
        return STAGE_ORDER.index(stage)
    except ValueError:
        return 0


def should_run_stage(stage: str, from_stage: str | None) -> bool:
    """Return True when ``stage`` should be executed for a run resuming at ``from_stage``.

    When ``from_stage`` is falsy the whole pipeline runs. Otherwise every stage at or
    after ``from_stage`` in :data:`STAGE_ORDER` runs and earlier stages are skipped.
    """
    if not from_stage:
        return True
    return stage_index(stage) >= stage_index(from_stage)


# --------------------------------------------------------------------------- #
# checkpoint.json
# --------------------------------------------------------------------------- #
def _checkpoint_path(work_dir: Path) -> Path:
    return Path(work_dir) / "checkpoint.json"


def load_checkpoint(work_dir: Path) -> dict[str, Any]:
    path = _checkpoint_path(work_dir)
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8")) or {}
    except (json.JSONDecodeError, OSError):
        return {}


def save_checkpoint(work_dir: Path, data: dict[str, Any]) -> None:
    ensure_dir(Path(work_dir))
    path = _checkpoint_path(work_dir)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def update_checkpoint(work_dir: Path, **patch: Any) -> dict[str, Any]:
    data = load_checkpoint(work_dir)
    data.update({k: v for k, v in patch.items() if v is not None})
    save_checkpoint(work_dir, data)
    return data


# --------------------------------------------------------------------------- #
# segments.json
# --------------------------------------------------------------------------- #
def save_segments(work_dir: Path, segments: list[Segment]) -> None:
    ensure_dir(Path(work_dir))
    path = Path(work_dir) / "segments.json"
    payload = [asdict(s) for s in segments]
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def load_segments(work_dir: Path) -> list[Segment]:
    path = Path(work_dir) / "segments.json"
    if not path.exists():
        return []
    try:
        raw = json.loads(path.read_text(encoding="utf-8")) or []
    except (json.JSONDecodeError, OSError):
        return []
    out: list[Segment] = []
    for item in raw:
        out.append(
            Segment(
                start=float(item.get("start") or 0.0),
                end=float(item.get("end") or 0.0),
                text=item.get("text") or "",
            )
        )
    return out


# --------------------------------------------------------------------------- #
# keyframes.json
# --------------------------------------------------------------------------- #
def save_keyframes(work_dir: Path, keyframes: list[Keyframe]) -> None:
    ensure_dir(Path(work_dir))
    path = Path(work_dir) / "keyframes.json"
    payload = [asdict(k) for k in keyframes]
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def load_keyframes(work_dir: Path) -> list[Keyframe]:
    path = Path(work_dir) / "keyframes.json"
    if not path.exists():
        return []
    try:
        raw = json.loads(path.read_text(encoding="utf-8")) or []
    except (json.JSONDecodeError, OSError):
        return []
    out: list[Keyframe] = []
    for item in raw:
        out.append(
            Keyframe(
                index=int(item.get("index") or 0),
                time=float(item.get("time") or 0.0),
                path=item.get("path") or "",
                rel_path=item.get("rel_path") or "",
                ocr_text=item.get("ocr_text") or "",
            )
        )
    return out
