from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    url: Optional[str] = None
    provider_ids: list[str] = Field(default_factory=list)
    force: bool = False
    prompt_template: Optional[str] = None
    start_sec: Optional[float] = None
    end_sec: Optional[float] = None


class TaskBatchCreate(BaseModel):
    urls: list[str] = Field(default_factory=list)
    provider_ids: list[str] = Field(default_factory=list)
    force: bool = False
    prompt_template: Optional[str] = None
    start_sec: Optional[float] = None
    end_sec: Optional[float] = None


class TaskRetryRequest(BaseModel):
    from_stage: Optional[str] = None
    provider_ids: Optional[list[str]] = None


class TaskAnalyzeRequest(BaseModel):
    provider_ids: list[str] = Field(default_factory=list)
    prompt_template: Optional[str] = None


class TaskDeleteRequest(BaseModel):
    delete_notes: bool = False


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
    video_cache_root: str
    cookies_file: str
    auto_delete_video: bool = True
    whisper_model: str
    whisper_device: str = "cpu"
    ocr_enabled: bool
    scene_threshold: float
    max_keyframes: int
    default_locale: str
    prefer_soft_subtitles: bool = True
    analysis_language: str = "zh-CN"
    cookie_custom_sites: str = ""
    host_notes_root: str = ""
    path_hint: str = ""


class SettingsUpdate(BaseModel):
    notes_root: Optional[str] = None
    video_cache_root: Optional[str] = None
    cookies_file: Optional[str] = None
    auto_delete_video: Optional[bool] = None
    whisper_model: Optional[str] = None
    whisper_device: Optional[str] = None
    ocr_enabled: Optional[bool] = None
    scene_threshold: Optional[float] = None
    max_keyframes: Optional[int] = None
    default_locale: Optional[str] = None
    prefer_soft_subtitles: Optional[bool] = None
    analysis_language: Optional[str] = None
    cookie_custom_sites: Optional[str] = None
    host_notes_root: Optional[str] = None
    path_hint: Optional[str] = None


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
    group: str = ""
    models: list[str] = Field(default_factory=list)
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None
    system_prompt: str = ""
    source: str = "db"


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
    group: str = ""
    models: list[str] = Field(default_factory=list)
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None
    system_prompt: str = ""


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


class TemplateOut(BaseModel):
    id: str
    labels: dict[str, str] = Field(default_factory=dict)
    description: dict[str, str] = Field(default_factory=dict)


class UsageOut(BaseModel):
    total: int
    by_status: dict[str, int] = Field(default_factory=dict)
    by_provider: dict[str, int] = Field(default_factory=dict)
    completed: int = 0
    failed: int = 0
    running: int = 0
    embeddings_indexed: int = 0


class HealthOut(BaseModel):
    status: str
    app: str
    database: str
    redis: str
