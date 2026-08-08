from __future__ import annotations

from typing import Any

from worker.config import settings
from worker.db import AppSetting, SessionLocal, Task
from worker.pipeline.checkpoint import TaskCancelled


def runtime_settings() -> dict[str, Any]:
    data = {
        "notes_root": settings.notes_root,
        "cookies_file": settings.cookies_file,
        "whisper_model": settings.whisper_model,
        "ocr_enabled": settings.ocr_enabled,
        "scene_threshold": settings.scene_threshold,
        "max_keyframes": settings.max_keyframes,
        "default_locale": settings.default_locale,
        "whisper_device": settings.whisper_device,
        "whisper_compute_type": settings.whisper_compute_type,
        "cache_root": settings.cache_root,
        "video_cache_root": settings.video_cache_root or settings.cache_root,
        "auto_delete_video": settings.auto_delete_video,
        "providers_file": settings.providers_file,
        "analysis_language": getattr(settings, "analysis_language", None)
        or settings.default_locale,
        "prefer_soft_subtitles": bool(getattr(settings, "prefer_soft_subtitles", True)),
    }
    db = SessionLocal()
    try:
        row = db.get(AppSetting, "runtime")
        if row and row.value:
            data.update(row.value)
    finally:
        db.close()
    return data


def update_task(
    task_id: str,
    *,
    status: str | None = None,
    progress: float | None = None,
    message: str | None = None,
    error: str | None = None,
    title: str | None = None,
    notes_path: str | None = None,
    meta_patch: dict[str, Any] | None = None,
) -> None:
    db = SessionLocal()
    try:
        row = db.get(Task, task_id)
        if not row:
            return
        if status is not None:
            row.status = status
        if progress is not None:
            row.progress = progress
        if message is not None:
            row.message = message
        if error is not None:
            row.error = error
        if title is not None:
            row.title = title
        if notes_path is not None:
            row.notes_path = notes_path
        if meta_patch:
            meta = dict(row.meta or {})
            meta.update(meta_patch)
            row.meta = meta
        db.commit()
    finally:
        db.close()


def get_task_meta(task_id: str) -> dict[str, Any]:
    db = SessionLocal()
    try:
        row = db.get(Task, task_id)
        if not row:
            return {}
        return dict(row.meta or {})
    finally:
        db.close()


def is_cancel_requested(task_id: str) -> bool:
    """Return True when task.meta.cancel_requested is truthy."""
    db = SessionLocal()
    try:
        row = db.get(Task, task_id)
        if not row:
            return False
        return bool((row.meta or {}).get("cancel_requested"))
    finally:
        db.close()


def raise_if_cancelled(task_id: str, *, mark_cancelling: bool = True) -> None:
    """Raise :class:`TaskCancelled` when a cancel has been requested for ``task_id``.

    When ``mark_cancelling`` is set the task status is flipped to ``cancelling`` before
    the exception propagates so the UI can reflect the graceful shutdown.
    """
    if not is_cancel_requested(task_id):
        return
    if mark_cancelling:
        update_task(task_id, status="cancelling", message="cancelling")
    raise TaskCancelled(f"task {task_id} cancelled")
