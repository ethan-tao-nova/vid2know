from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://vid2know:vid2know_change_me@postgres:5432/vid2know"
    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/0"
    celery_result_backend: str = "redis://redis:6379/1"

    notes_root: str = "/data/notes"
    upload_root: str = "/data/uploads"
    cache_root: str = "/data/cache"
    cookies_file: str = ""
    providers_file: str = "/config/providers.yaml"

    whisper_model: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    ocr_enabled: bool = True
    scene_threshold: float = 27.0
    max_keyframes: int = 80
    default_locale: str = "zh-CN"


settings = Settings()
