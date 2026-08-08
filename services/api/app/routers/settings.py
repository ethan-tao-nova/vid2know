from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import AppSetting
from app.schemas import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTING_KEY = "runtime"


def _defaults() -> dict:
    return {
        "notes_root": settings.notes_root,
        "video_cache_root": settings.video_cache_root or settings.cache_root,
        "cookies_file": settings.cookies_file,
        "auto_delete_video": settings.auto_delete_video,
        "whisper_model": settings.whisper_model,
        "whisper_device": settings.whisper_device,
        "ocr_enabled": settings.ocr_enabled,
        "scene_threshold": settings.scene_threshold,
        "max_keyframes": settings.max_keyframes,
        "default_locale": settings.default_locale,
        "prefer_soft_subtitles": settings.prefer_soft_subtitles,
        "analysis_language": settings.analysis_language,
        "cookie_custom_sites": settings.cookie_custom_sites,
        "host_notes_root": settings.host_notes_root,
        "path_hint": settings.path_hint,
    }


def get_runtime_settings(db: Session) -> dict:
    row = db.get(AppSetting, SETTING_KEY)
    data = _defaults()
    if row and row.value:
        data.update(row.value)
    return data


@router.get("", response_model=SettingsOut)
def read_settings(db: Session = Depends(get_db)):
    return SettingsOut(**get_runtime_settings(db))


@router.put("", response_model=SettingsOut)
def update_settings(body: SettingsUpdate, db: Session = Depends(get_db)):
    data = get_runtime_settings(db)
    patch = body.model_dump(exclude_none=True)
    data.update(patch)
    if "notes_root" in patch:
        Path(data["notes_root"]).mkdir(parents=True, exist_ok=True)
    if "video_cache_root" in patch:
        Path(data["video_cache_root"]).mkdir(parents=True, exist_ok=True)
    row = db.get(AppSetting, SETTING_KEY)
    if row is None:
        row = AppSetting(key=SETTING_KEY, value=data)
        db.add(row)
    else:
        row.value = data
    db.commit()
    return SettingsOut(**data)
