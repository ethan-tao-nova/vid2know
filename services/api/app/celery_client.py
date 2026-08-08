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


def enqueue_process_task(task_id: str) -> None:
    celery_app.send_task("worker.tasks.process_video_task", args=[task_id])
