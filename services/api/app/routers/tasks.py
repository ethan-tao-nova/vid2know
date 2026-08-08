from __future__ import annotations

import asyncio
import io
import json
import shutil
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse, StreamingResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import embeddings
from app.celery_client import enqueue_analyze_task, enqueue_process_task, revoke_celery_task
from app.config import settings
from app.db import SessionLocal, get_db
from app.export_doc import markdown_to_docx, markdown_to_pdf
from app.export_xmind import markdown_to_xmind
from app.models import Task
from app.prompt_templates import TEMPLATES, normalize_template_id
from app.schemas import (
    TaskAnalyzeRequest,
    TaskBatchCreate,
    TaskCreate,
    TaskOut,
    TaskRetryRequest,
    TemplateOut,
    UsageOut,
)
from app.url_normalize import normalize_video_url

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

TERMINAL_STATUSES = {"completed", "failed", "cancelled"}


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def append_log(row: Task, event: str, message: str = "", *, level: str = "info") -> None:
    """Append a structured log entry into ``task.meta['logs']`` (reassign for JSONB)."""
    meta = dict(row.meta or {})
    logs = list(meta.get("logs") or [])
    logs.append({"ts": _now_iso(), "event": event, "message": message, "level": level})
    meta["logs"] = logs[-500:]
    row.meta = meta


def _notes_dir(row: Task) -> Path:
    if not row.notes_path:
        raise HTTPException(404, "Notes not ready")
    path = Path(row.notes_path)
    if not path.exists():
        raise HTTPException(404, "Notes directory missing")
    return path


def _safe_join(base: Path, rel: str) -> Path:
    """Resolve ``rel`` under ``base`` and reject path traversal."""
    candidate = (base / rel).resolve()
    base_resolved = base.resolve()
    if base_resolved != candidate and base_resolved not in candidate.parents:
        raise HTTPException(400, "Invalid path")
    return candidate


def _note_markdown(row: Task) -> tuple[Path, str]:
    notes = _notes_dir(row)
    note = notes / "note.md"
    if not note.exists():
        raise HTTPException(404, "note.md missing")
    return notes, note.read_text(encoding="utf-8")


def _build_meta(body: TaskCreate | TaskBatchCreate, url: str) -> dict[str, Any]:
    meta: dict[str, Any] = {"normalized_url": normalize_video_url(url)}
    if body.prompt_template is not None:
        meta["prompt_template"] = normalize_template_id(body.prompt_template)
    if body.start_sec is not None:
        meta["start_sec"] = float(body.start_sec)
    if body.end_sec is not None:
        meta["end_sec"] = float(body.end_sec)
    return meta


def _find_duplicate(db: Session, normalized: str) -> Task | None:
    if not normalized:
        return None
    return (
        db.query(Task)
        .filter(Task.meta["normalized_url"].astext == normalized)
        .order_by(Task.created_at.desc())
        .first()
    )


def _index_task_embedding(row: Task) -> None:
    """Best-effort embedding upsert from title + note content."""
    try:
        text = row.title or ""
        if row.notes_path:
            note = Path(row.notes_path) / "note.md"
            if note.exists():
                text = f"{row.title or ''}\n{note.read_text(encoding='utf-8')[:4000]}"
        if text.strip():
            embeddings.upsert_embedding(row.id, text, meta={"title": row.title or ""})
    except Exception:  # noqa: BLE001 — indexing must never break a request
        pass


# ---------------------------------------------------------------------------
# static routes (declared BEFORE /{task_id})
# ---------------------------------------------------------------------------
@router.get("", response_model=list[TaskOut])
def list_tasks(
    db: Session = Depends(get_db),
    q: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    mode: str = Query(default="auto", pattern="^(auto|text|semantic)$"),
):
    if q and q.strip():
        use_semantic = mode == "semantic" or (mode == "auto" and embeddings.store_path().exists())
        if use_semantic:
            ranked = embeddings.search_embeddings(q.strip(), top_k=limit * 3)
            ids = [tid for tid, score in ranked if score > 0]
            if ids:
                rows = {r.id: r for r in db.query(Task).filter(Task.id.in_(ids)).all()}
                ordered = [rows[i] for i in ids if i in rows]
                if status:
                    ordered = [r for r in ordered if r.status == status]
                return ordered[:limit]
            if mode == "semantic":
                return []
        # text search fallback
        like = f"%{q.strip()}%"
        query = db.query(Task).filter(or_(Task.title.ilike(like), Task.source_url.ilike(like)))
        if status:
            query = query.filter(Task.status == status)
        return query.order_by(Task.created_at.desc()).limit(limit).all()

    query = db.query(Task)
    if status:
        query = query.filter(Task.status == status)
    return query.order_by(Task.created_at.desc()).limit(limit).all()


@router.get("/templates", response_model=list[TemplateOut])
def list_templates():
    return [
        TemplateOut(id=t["id"], labels=t.get("labels", {}), description=t.get("description", {}))
        for t in TEMPLATES
    ]


@router.get("/usage", response_model=UsageOut)
def usage(db: Session = Depends(get_db)):
    by_status: dict[str, int] = {}
    by_provider: dict[str, int] = {}
    total = 0
    for row in db.query(Task).all():
        total += 1
        by_status[row.status] = by_status.get(row.status, 0) + 1
        for pid in row.provider_ids or []:
            by_provider[str(pid)] = by_provider.get(str(pid), 0) + 1
    running = sum(v for k, v in by_status.items() if k not in TERMINAL_STATUSES and k != "pending")
    indexed = len(embeddings._read_all())  # noqa: SLF001 — internal helper reuse
    return UsageOut(
        total=total,
        by_status=by_status,
        by_provider=by_provider,
        completed=by_status.get("completed", 0),
        failed=by_status.get("failed", 0),
        running=running,
        embeddings_indexed=indexed,
    )


@router.post("/reindex-embeddings")
def reindex_embeddings(db: Session = Depends(get_db)):
    count = 0
    for row in db.query(Task).all():
        if row.notes_path and (Path(row.notes_path) / "note.md").exists():
            _index_task_embedding(row)
            count += 1
    return {"reindexed": count}


@router.post("", response_model=TaskOut, status_code=201)
def create_task_from_url(body: TaskCreate, db: Session = Depends(get_db)):
    if not body.url or not body.url.strip():
        raise HTTPException(400, "url is required")
    url = body.url.strip()
    normalized = normalize_video_url(url)

    if not body.force:
        existing = _find_duplicate(db, normalized)
        if existing:
            raise HTTPException(
                409,
                detail={
                    "message": "Duplicate video already ingested",
                    "task_id": existing.id,
                    "normalized_url": normalized,
                },
            )

    task_id = str(uuid.uuid4())
    row = Task(
        id=task_id,
        source_type="url",
        source_url=url,
        status="pending",
        progress=0,
        message="queued",
        provider_ids=body.provider_ids or [],
        meta=_build_meta(body, url),
    )
    append_log(row, "created", f"URL task created: {url}")
    db.add(row)
    db.commit()
    db.refresh(row)

    celery_id = enqueue_process_task(task_id)
    row.meta = {**(row.meta or {}), "celery_id": celery_id}
    append_log(row, "queued", f"celery id {celery_id}")
    db.commit()
    db.refresh(row)
    return row


@router.post("/batch", response_model=list[TaskOut])
def create_batch(body: TaskBatchCreate, db: Session = Depends(get_db)):
    created: list[Task] = []
    seen: set[str] = set()
    for raw in body.urls:
        url = (raw or "").strip()
        if not url:
            continue
        normalized = normalize_video_url(url)
        if normalized in seen:
            continue
        seen.add(normalized)
        if not body.force and _find_duplicate(db, normalized):
            continue
        task_id = str(uuid.uuid4())
        row = Task(
            id=task_id,
            source_type="url",
            source_url=url,
            status="pending",
            progress=0,
            message="queued",
            provider_ids=body.provider_ids or [],
            meta=_build_meta(body, url),
        )
        append_log(row, "created", f"batch URL task: {url}")
        db.add(row)
        db.commit()
        db.refresh(row)
        celery_id = enqueue_process_task(task_id)
        row.meta = {**(row.meta or {}), "celery_id": celery_id}
        db.commit()
        db.refresh(row)
        created.append(row)
    return created


@router.post("/upload", response_model=TaskOut, status_code=201)
async def create_task_from_upload(
    file: UploadFile = File(...),
    provider_ids: str = Form("[]"),
    prompt_template: str | None = Form(None),
    start_sec: float | None = Form(None),
    end_sec: float | None = Form(None),
    db: Session = Depends(get_db),
):
    try:
        providers = json.loads(provider_ids) if provider_ids else []
        if not isinstance(providers, list):
            providers = []
    except json.JSONDecodeError:
        providers = []

    task_id = str(uuid.uuid4())
    upload_dir = Path(settings.upload_root) / task_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / (file.filename or "video.mp4")
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    meta: dict[str, Any] = {"upload_path": str(dest)}
    if prompt_template is not None:
        meta["prompt_template"] = normalize_template_id(prompt_template)
    if start_sec is not None:
        meta["start_sec"] = float(start_sec)
    if end_sec is not None:
        meta["end_sec"] = float(end_sec)

    row = Task(
        id=task_id,
        source_type="upload",
        source_filename=file.filename,
        status="pending",
        progress=0,
        message="queued",
        provider_ids=providers,
        meta=meta,
    )
    append_log(row, "created", f"upload task: {file.filename}")
    db.add(row)
    db.commit()
    db.refresh(row)

    celery_id = enqueue_process_task(task_id)
    row.meta = {**(row.meta or {}), "celery_id": celery_id}
    db.commit()
    db.refresh(row)
    return row


# ---------------------------------------------------------------------------
# dynamic /{task_id} routes
# ---------------------------------------------------------------------------
@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: str, db: Session = Depends(get_db)):
    row = db.get(Task, task_id)
    if not row:
        raise HTTPException(404, "Task not found")
    return row


@router.post("/{task_id}/cancel", response_model=TaskOut)
def cancel_task(task_id: str, db: Session = Depends(get_db)):
    row = db.get(Task, task_id)
    if not row:
        raise HTTPException(404, "Task not found")
    if row.status in TERMINAL_STATUSES:
        raise HTTPException(409, f"Task already {row.status}")
    celery_id = (row.meta or {}).get("celery_id")
    if celery_id:
        revoke_celery_task(celery_id)
    row.status = "cancelled"
    row.message = "cancelled"
    append_log(row, "cancelled", "cancel requested via API")
    db.commit()
    db.refresh(row)
    return row


@router.post("/{task_id}/retry", response_model=TaskOut)
def retry_task(task_id: str, body: TaskRetryRequest | None = None, db: Session = Depends(get_db)):
    row = db.get(Task, task_id)
    if not row:
        raise HTTPException(404, "Task not found")
    body = body or TaskRetryRequest()
    from_stage = body.from_stage
    if body.provider_ids is not None:
        row.provider_ids = body.provider_ids
    row.status = "pending"
    row.progress = 0
    row.error = None
    row.message = "queued (retry)"
    meta = dict(row.meta or {})
    if from_stage:
        meta["from_stage"] = from_stage
    row.meta = meta
    append_log(row, "retry", f"from_stage={from_stage or 'start'}")
    db.commit()

    celery_id = enqueue_process_task(task_id, from_stage=from_stage)
    row.meta = {**(row.meta or {}), "celery_id": celery_id}
    db.commit()
    db.refresh(row)
    return row


@router.post("/{task_id}/analyze", response_model=TaskOut)
def analyze_task(task_id: str, body: TaskAnalyzeRequest, db: Session = Depends(get_db)):
    row = db.get(Task, task_id)
    if not row:
        raise HTTPException(404, "Task not found")
    if body.provider_ids:
        row.provider_ids = body.provider_ids
    meta = dict(row.meta or {})
    if body.prompt_template is not None:
        meta["prompt_template"] = normalize_template_id(body.prompt_template)
    row.meta = meta
    row.status = "analyzing"
    row.message = "re-running analysis"
    append_log(row, "analyze", f"providers={row.provider_ids}")
    db.commit()

    celery_id = enqueue_analyze_task(task_id, list(row.provider_ids or []))
    row.meta = {**(row.meta or {}), "celery_id": celery_id}
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{task_id}")
def delete_task(task_id: str, delete_notes: bool = Query(default=False), db: Session = Depends(get_db)):
    row = db.get(Task, task_id)
    if not row:
        raise HTTPException(404, "Task not found")
    celery_id = (row.meta or {}).get("celery_id")
    if celery_id and row.status not in TERMINAL_STATUSES:
        revoke_celery_task(celery_id)

    removed_notes = False
    if delete_notes and row.notes_path:
        notes = Path(row.notes_path)
        if notes.exists() and notes.is_dir():
            shutil.rmtree(notes, ignore_errors=True)
            removed_notes = True
    upload_dir = Path(settings.upload_root) / task_id
    if upload_dir.exists():
        shutil.rmtree(upload_dir, ignore_errors=True)

    embeddings.delete_embedding(task_id)
    db.delete(row)
    db.commit()
    return {"deleted": task_id, "notes_removed": removed_notes}


@router.get("/{task_id}/note")
def get_note_markdown(task_id: str, db: Session = Depends(get_db)):
    row = db.get(Task, task_id)
    if not row:
        raise HTTPException(404, "Task not found")
    notes, content = _note_markdown(row)
    return {"path": str(notes / "note.md"), "content": content}


@router.get("/{task_id}/artifacts")
def list_artifacts(task_id: str, db: Session = Depends(get_db)):
    row = db.get(Task, task_id)
    if not row:
        raise HTTPException(404, "Task not found")
    notes = _notes_dir(row)
    items: list[dict[str, Any]] = []
    for path in sorted(notes.rglob("*")):
        if path.is_file():
            rel = path.relative_to(notes)
            items.append(
                {
                    "path": str(rel),
                    "size": path.stat().st_size,
                    "ext": path.suffix.lower().lstrip("."),
                }
            )
    return {"notes_dir": str(notes), "files": items}


@router.get("/{task_id}/asset")
def get_asset(
    task_id: str,
    path: str = Query(...),
    w: int | None = Query(default=None, ge=1, le=4096),
    db: Session = Depends(get_db),
):
    row = db.get(Task, task_id)
    if not row:
        raise HTTPException(404, "Task not found")
    notes = _notes_dir(row)
    target = _safe_join(notes, path)
    if not target.exists() or not target.is_file():
        raise HTTPException(404, "Asset not found")

    if w and target.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".webp"}:
        try:
            from PIL import Image

            with Image.open(target) as im:
                if im.width > w:
                    ratio = w / im.width
                    im = im.resize((w, max(1, int(im.height * ratio))))
                buf = io.BytesIO()
                fmt = "PNG" if target.suffix.lower() == ".png" else "JPEG"
                if fmt == "JPEG" and im.mode not in ("RGB", "L"):
                    im = im.convert("RGB")
                im.save(buf, format=fmt)
                buf.seek(0)
                media = "image/png" if fmt == "PNG" else "image/jpeg"
                return StreamingResponse(buf, media_type=media)
        except Exception:  # noqa: BLE001 — fall back to original file
            pass
    return FileResponse(str(target))


@router.get("/{task_id}/analysis/{filename}")
def get_analysis(task_id: str, filename: str, db: Session = Depends(get_db)):
    row = db.get(Task, task_id)
    if not row:
        raise HTTPException(404, "Task not found")
    notes = _notes_dir(row)
    target = _safe_join(notes / "analysis", filename)
    if not target.exists() or not target.is_file():
        raise HTTPException(404, "Analysis file not found")
    return {"path": str(target), "content": target.read_text(encoding="utf-8")}


@router.get("/{task_id}/logs")
def get_logs(task_id: str, db: Session = Depends(get_db)):
    row = db.get(Task, task_id)
    if not row:
        raise HTTPException(404, "Task not found")
    return {"logs": (row.meta or {}).get("logs", [])}


@router.get("/{task_id}/export.zip")
def export_zip(task_id: str, db: Session = Depends(get_db)):
    row = db.get(Task, task_id)
    if not row:
        raise HTTPException(404, "Task not found")
    notes = _notes_dir(row)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in notes.rglob("*"):
            if path.is_file():
                zf.write(path, arcname=str(path.relative_to(notes)))
    buf.seek(0)
    fname = f"{(row.title or task_id)}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{task_id}.zip"', "X-Filename": fname},
    )


@router.get("/{task_id}/export/{fmt}")
def export_format(task_id: str, fmt: str, db: Session = Depends(get_db)):
    fmt = fmt.lower()
    if fmt not in {"md", "docx", "pdf", "xmind"}:
        raise HTTPException(400, "Unsupported format")
    row = db.get(Task, task_id)
    if not row:
        raise HTTPException(404, "Task not found")
    notes, markdown = _note_markdown(row)
    title = row.title or task_id

    if fmt == "md":
        return PlainTextResponse(
            markdown,
            media_type="text/markdown; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{task_id}.md"'},
        )

    export_dir = Path(settings.cache_root) / "exports" / task_id
    export_dir.mkdir(parents=True, exist_ok=True)

    if fmt == "docx":
        out = export_dir / "note.docx"
        markdown_to_docx(markdown, out, base_dir=notes)
        media = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif fmt == "pdf":
        out = export_dir / "note.pdf"
        markdown_to_pdf(markdown, out, base_dir=notes)
        media = "application/pdf"
    else:  # xmind
        out = export_dir / "note.xmind"
        markdown_to_xmind(markdown, out, title=title)
        media = "application/vnd.xmind.workbook"

    return FileResponse(
        str(out),
        media_type=media,
        filename=f"{task_id}.{fmt}",
    )


@router.get("/{task_id}/events")
async def task_events(task_id: str):
    """Server-Sent Events stream of task status changes."""

    async def event_stream():
        last_signature: str | None = None
        idle_ticks = 0
        while True:
            db = SessionLocal()
            try:
                row = db.get(Task, task_id)
                if not row:
                    yield f"event: error\ndata: {json.dumps({'message': 'Task not found'})}\n\n"
                    return
                payload = {
                    "id": row.id,
                    "status": row.status,
                    "progress": row.progress,
                    "message": row.message,
                    "error": row.error,
                }
                signature = json.dumps(payload, sort_keys=True)
                terminal = row.status in TERMINAL_STATUSES
            finally:
                db.close()

            if signature != last_signature:
                last_signature = signature
                yield f"data: {signature}\n\n"
                idle_ticks = 0
            else:
                idle_ticks += 1
                if idle_ticks % 15 == 0:
                    yield ": keep-alive\n\n"

            if terminal:
                yield "event: done\ndata: {}\n\n"
                return
            await asyncio.sleep(1.0)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
