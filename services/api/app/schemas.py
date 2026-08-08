from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    url: Optional[str] = None
    provider_ids: list[str] = Field(default_factory=list)


class TaskOut(BaseModel):
    id: str
    source_type: str
    source_url: Optional[str] = None
    source_filename: Optional[str] = None
    title: Optional[str] = None
    status: str
    progress: float
    message: str
    error: Optional[str] = None
    notes_path: Optional[str] = None
    provider_ids: list[Any] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SettingsOut(BaseModel):
    notes_root: str
    cookies_file: str
    whisper_model: str
    ocr_enabled: bool
    scene_threshold: float
    max_keyframes: int
    default_locale: str


class SettingsUpdate(BaseModel):
    notes_root: Optional[str] = None
    cookies_file: Optional[str] = None
    whisper_model: Optional[str] = None
    ocr_enabled: Optional[bool] = None
    scene_threshold: Optional[float] = None
    max_keyframes: Optional[int] = None
    default_locale: Optional[str] = None


class ProviderOut(BaseModel):
    id: str
    name: str
    type: str
    enabled: bool
    base_url: str
    default_model: str
    temperature: float
    timeout_seconds: int
    has_api_key: bool = False
    api_key_masked: str = ""


class ProviderUpsert(BaseModel):
    id: str
    name: str
    type: str = "openai_compatible"
    enabled: bool = False
    base_url: str = ""
    api_key: Optional[str] = None
    default_model: str = ""
    temperature: float = 0.3
    timeout_seconds: int = 120


class ProviderTestRequest(BaseModel):
    id: Optional[str] = None
    type: str = "openai_compatible"
    base_url: str
    api_key: str
    default_model: str
    timeout_seconds: int = 60


class ProviderTestResult(BaseModel):
    ok: bool
    message: str
    sample: Optional[str] = None


class HealthOut(BaseModel):
    status: str
    app: str
    database: str
    redis: str
