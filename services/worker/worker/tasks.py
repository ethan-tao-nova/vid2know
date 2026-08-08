from celery import Celery

from worker.config import settings
from worker.pipeline.analyze import analyze_existing_task as _analyze
from worker.pipeline.runner import process_video_task as _process

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
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)


@celery_app.task(name="worker.tasks.process_video_task", bind=True, max_retries=0)
def process_video_task(self, task_id: str):
    return _process(task_id)


@celery_app.task(name="worker.tasks.analyze_task", bind=True, max_retries=0)
def analyze_task(self, task_id: str, provider_ids: list[str] | None = None):
    return _analyze(task_id, provider_ids)
