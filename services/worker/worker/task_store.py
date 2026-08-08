from __future__ import annotations

from typing import Any

from worker.config import settings
from worker.db import AppSetting, SessionLocal, Task


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
        "providers_file": settings.providers_file,
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
