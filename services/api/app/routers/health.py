from __future__ import annotations

import redis
from fastapi import APIRouter
from sqlalchemy import text

from app.config import settings
from app.db import engine
from app.schemas import HealthOut

router = APIRouter(tags=["health"])


@router.get("/api/health", response_model=HealthOut)
def health():
    db_status = "ok"
    redis_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001
        db_status = f"error: {exc}"
    try:
        r = redis.from_url(settings.redis_url)
        r.ping()
    except Exception as exc:  # noqa: BLE001
        redis_status = f"error: {exc}"
    status = "ok" if db_status == "ok" and redis_status == "ok" else "degraded"
    return HealthOut(status=status, app=settings.app_name, database=db_status, redis=redis_status)
