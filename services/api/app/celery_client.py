from __future__ import annotations

from celery import Celery

from app.config import settings

celery_app = Celery(
    "vid2know",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)
celery_app.conf.update(
    task_track_started=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Shanghai",
    enable_utc=True,
)


def enqueue_process_task(task_id: str, *, from_stage: str | None = None) -> str:
    """Queue the full processing pipeline. Returns the Celery task id."""
    kwargs = {}
    if from_stage:
        kwargs["from_stage"] = from_stage
    result = celery_app.send_task(
        "worker.tasks.process_video_task",
        args=[task_id],
        kwargs=kwargs,
    )
    return result.id


def enqueue_analyze_task(task_id: str, provider_ids: list[str] | None = None) -> str:
    """Queue an analysis-only re-run for an already processed task."""
    result = celery_app.send_task(
        "worker.tasks.analyze_task",
        args=[task_id],
        kwargs={"provider_ids": provider_ids or []},
    )
    return result.id


def revoke_celery_task(celery_id: str, *, terminate: bool = True) -> None:
    """Revoke (and optionally terminate) a running Celery task."""
    if not celery_id:
        return
    celery_app.control.revoke(celery_id, terminate=terminate, signal="SIGTERM")
