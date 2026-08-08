from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.celery_client import enqueue_process_task
from app.config import settings
from app.db import get_db
from app.models import Task
from app.schemas import TaskCreate, TaskOut

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskOut])
def list_tasks(db: Session = Depends(get_db), limit: int = 50):
    rows = db.query(Task).order_by(Task.created_at.desc()).limit(limit).all()
    return rows


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: str, db: Session = Depends(get_db)):
    row = db.get(Task, task_id)
    if not row:
        raise HTTPException(404, "Task not found")
    return row


@router.post("", response_model=TaskOut)
def create_task_from_url(body: TaskCreate, db: Session = Depends(get_db)):
    if not body.url or not body.url.strip():
        raise HTTPException(400, "url is required")
    task_id = str(uuid.uuid4())
    row = Task(
        id=task_id,
        source_type="url",
        source_url=body.url.strip(),
        status="pending",
        progress=0,
        message="queued",
        provider_ids=body.provider_ids or [],
        meta={},
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    enqueue_process_task(task_id)
    return row


@router.post("/upload", response_model=TaskOut)
async def create_task_from_upload(
    file: UploadFile = File(...),
    provider_ids: str = Form("[]"),
    db: Session = Depends(get_db),
):
    import json

    try:
        providers = json.loads(provider_ids) if provider_ids else []
    except json.JSONDecodeError:
        providers = []

    task_id = str(uuid.uuid4())
    upload_dir = Path(settings.upload_root) / task_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / (file.filename or "video.mp4")
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    row = Task(
        id=task_id,
        source_type="upload",
        source_filename=file.filename,
        status="pending",
        progress=0,
        message="queued",
        provider_ids=providers,
        meta={"upload_path": str(dest)},
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    enqueue_process_task(task_id)
    return row


@router.get("/{task_id}/note")
def get_note_markdown(task_id: str, db: Session = Depends(get_db)):
    row = db.get(Task, task_id)
    if not row:
        raise HTTPException(404, "Task not found")
    if not row.notes_path:
        raise HTTPException(404, "Note not ready")
    note = Path(row.notes_path) / "note.md"
    if not note.exists():
        raise HTTPException(404, "note.md missing")
    return {"path": str(note), "content": note.read_text(encoding="utf-8")}
