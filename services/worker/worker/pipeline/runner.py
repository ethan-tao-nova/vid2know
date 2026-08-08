from __future__ import annotations

from datetime import datetime
from pathlib import Path

from worker.ai.illustrated import NoteScene, save_scenes_to_notes_dir
from worker.db import SessionLocal, Task
from worker.pipeline.analyze import analyze_existing_task
from worker.pipeline.assemble import write_meta, write_note_md, write_transcript_md
from worker.pipeline.checkpoint import (
    TaskCancelled,
    load_checkpoint,
    load_keyframes,
    load_segments,
    save_keyframes,
    save_segments,
    should_run_stage,
    update_checkpoint,
)
from worker.pipeline.download import cleanup_media, clip_media, download_media
from worker.pipeline.embeddings_index import build_search_text, index_note
from worker.pipeline.frames import adaptive_max_keyframes, extract_keyframes
from worker.pipeline.ocr import apply_ocr
from worker.pipeline.transcript import get_transcript
from worker.pipeline.types import (
    Keyframe,
    PipelineResult,
    Segment,
    ensure_dir,
    format_ts,
    slugify,
)
from worker.task_store import raise_if_cancelled, runtime_settings, update_task


def _segments_near(segments: list[Segment], t: float, window: float = 8.0) -> str:
    parts = [s.text for s in segments if s.start <= t + window and s.end >= t - window]
    return " ".join(parts).strip()


def _build_scenes(keyframes: list[Keyframe], segments: list[Segment]) -> list[NoteScene]:
    scenes: list[NoteScene] = []
    for fr in keyframes:
        scenes.append(
            NoteScene(
                time=fr.time,
                rel_path=fr.rel_path,
                text=_segments_near(segments, fr.time),
                ocr_text=fr.ocr_text or "",
            )
        )
    return scenes


def process_video_task(task_id: str) -> dict:
    db = SessionLocal()
    try:
        task = db.get(Task, task_id)
        if not task:
            raise RuntimeError(f"task {task_id} not found")
        source_type = task.source_type
        source_url = task.source_url
        meta = dict(task.meta or {})
        upload_path = meta.get("upload_path")
        provider_ids = list(task.provider_ids or [])
    finally:
        db.close()

    from_stage = meta.get("from_stage") or meta.get("resume_from")
    start_sec = meta.get("start_sec")
    end_sec = meta.get("end_sec")

    cfg = runtime_settings()
    # video_cache_root overrides cache_root when set in settings UI
    cache_root = Path(cfg.get("video_cache_root") or cfg["cache_root"])
    notes_root = Path(cfg["notes_root"])
    auto_delete = bool(cfg.get("auto_delete_video", True))
    work_dir = ensure_dir(cache_root / task_id)
    ckpt = load_checkpoint(work_dir)
    video_path = ckpt.get("video_path") or ""

    try:
        raise_if_cancelled(task_id)

        # ----------------------------------------------------------------- #
        # 1. DOWNLOAD (+ optional clip)
        # ----------------------------------------------------------------- #
        if should_run_stage("downloading", from_stage):
            update_task(task_id, status="downloading", progress=5, message="downloading media")

            if source_type == "upload":
                if not upload_path or not Path(upload_path).exists():
                    raise RuntimeError("upload file missing")
                video_path = upload_path
                title = Path(upload_path).stem
                duration = 0.0
                subtitle_paths: list[str] = []
                webpage_url = None
                info_meta = {"source": "upload"}
            else:
                cookies = (cfg.get("cookies_file") or "").strip() or None
                dl = download_media(url=source_url, work_dir=work_dir, cookies_file=cookies)
                video_path = dl["video_path"]
                title = dl["title"]
                duration = dl["duration"]
                subtitle_paths = dl["subtitle_paths"]
                webpage_url = dl["webpage_url"]
                info_meta = {
                    "yt_dlp_id": dl["info"].get("id"),
                    "extractor": dl["info"].get("extractor"),
                    "video_cache_root": str(cache_root),
                }

            raise_if_cancelled(task_id)

            clipped = False
            if start_sec is not None or end_sec is not None:
                update_task(task_id, progress=15, message="clipping media")
                video_path = clip_media(
                    video_path,
                    work_dir,
                    float(start_sec or 0.0),
                    float(end_sec or 0.0),
                )
                clipped = True
                # Subtitle timings no longer align with a clipped media; force ASR.
                subtitle_paths = []
                if end_sec and float(end_sec) > float(start_sec or 0.0):
                    duration = float(end_sec) - float(start_sec or 0.0)
                else:
                    duration = 0.0

            update_checkpoint(
                work_dir,
                video_path=video_path,
                title=title,
                duration=duration,
                subtitle_paths=subtitle_paths,
                webpage_url=webpage_url,
                info_meta=info_meta,
                clipped=clipped,
            )
        else:
            title = ckpt.get("title") or (Path(video_path).stem if video_path else task_id)
            duration = float(ckpt.get("duration") or 0.0)
            subtitle_paths = list(ckpt.get("subtitle_paths") or [])
            webpage_url = ckpt.get("webpage_url")
            info_meta = dict(ckpt.get("info_meta") or {})
            clipped = bool(ckpt.get("clipped"))

        update_task(task_id, title=title, progress=20, message="transcribing")
        raise_if_cancelled(task_id)

        # ----------------------------------------------------------------- #
        # 2. TRANSCRIBE
        # ----------------------------------------------------------------- #
        if should_run_stage("transcribing", from_stage):
            update_task(task_id, status="transcribing", progress=25, message="building transcript")
            segments, transcript_source = get_transcript(
                video_path,
                subtitle_paths,
                whisper_model=cfg.get("whisper_model") or "base",
                whisper_device=cfg.get("whisper_device") or "cpu",
                whisper_compute_type=cfg.get("whisper_compute_type") or "int8",
            )
            if not duration and segments:
                duration = max(s.end for s in segments)
            save_segments(work_dir, segments)
            update_checkpoint(work_dir, transcript_source=transcript_source, duration=duration)
        else:
            segments = load_segments(work_dir)
            transcript_source = ckpt.get("transcript_source") or "subtitle"
            if not duration and segments:
                duration = max(s.end for s in segments)

        raise_if_cancelled(task_id)

        # Stable note directory across resumes.
        if ckpt.get("notes_dir"):
            notes_dir = Path(ckpt["notes_dir"])
            ensure_dir(notes_dir)
        else:
            date_prefix = datetime.now().strftime("%Y%m%d")
            notes_dir = ensure_dir(notes_root / f"{date_prefix}_{slugify(title)}_{task_id[:8]}")
            update_checkpoint(work_dir, notes_dir=str(notes_dir))
        images_dir = ensure_dir(notes_dir / "images")
        ensure_dir(notes_dir / "analysis")

        # ----------------------------------------------------------------- #
        # 3. EXTRACT FRAMES
        # ----------------------------------------------------------------- #
        max_frames = adaptive_max_keyframes(duration, int(cfg.get("max_keyframes") or 80))
        if should_run_stage("extracting_frames", from_stage):
            update_task(
                task_id, status="extracting_frames", progress=45, message="extracting keyframes"
            )
            keyframes = extract_keyframes(
                video_path,
                images_dir,
                threshold=float(cfg.get("scene_threshold") or 27.0),
                max_frames=max_frames,
            )
            save_keyframes(work_dir, keyframes)
        else:
            keyframes = load_keyframes(work_dir)

        raise_if_cancelled(task_id)

        # ----------------------------------------------------------------- #
        # 4. OCR
        # ----------------------------------------------------------------- #
        if should_run_stage("ocr", from_stage):
            update_task(task_id, status="ocr", progress=65, message="running OCR")
            keyframes = apply_ocr(keyframes, enabled=bool(cfg.get("ocr_enabled", True)))
            save_keyframes(work_dir, keyframes)

        raise_if_cancelled(task_id)

        result = PipelineResult(
            title=title,
            source_url=webpage_url or source_url,
            duration=duration,
            video_path=video_path,
            transcript_source=transcript_source,
            segments=segments,
            keyframes=keyframes,
            notes_dir=str(notes_dir),
            meta={
                **info_meta,
                "whisper_model": cfg.get("whisper_model"),
                "ocr_enabled": cfg.get("ocr_enabled"),
                "auto_delete_video": auto_delete,
                "clipped": clipped,
                "start_sec": start_sec,
                "end_sec": end_sec,
                "prompt_template": meta.get("prompt_template") or "illustrated",
                "keyframes": [
                    {"time": fr.time, "rel_path": fr.rel_path, "ocr_text": fr.ocr_text}
                    for fr in keyframes
                ],
                "versions": {
                    "pipeline": "0.2.0",
                },
            },
        )

        # ----------------------------------------------------------------- #
        # 5. ASSEMBLE + INDEX
        # ----------------------------------------------------------------- #
        if should_run_stage("assembling", from_stage):
            update_task(task_id, status="assembling", progress=80, message="writing markdown")
            write_transcript_md(notes_dir / "transcript.md", segments)
            write_note_md(result)
            write_meta(result)

            scenes = _build_scenes(keyframes, segments)
            save_scenes_to_notes_dir(notes_dir, scenes)

            transcript_text = "\n".join(f"[{format_ts(s.start)}] {s.text}" for s in segments)
            ocr_snippets = [
                f"[{format_ts(fr.time)}]\n{fr.ocr_text}" for fr in keyframes if fr.ocr_text
            ]
            search_text = build_search_text(title, transcript_text, ocr_snippets)
            index_info = index_note(
                task_id,
                title=title,
                search_text=search_text,
                cache_root=cfg.get("cache_root"),
                metadata={
                    "notes_dir": str(notes_dir),
                    "duration": duration,
                    "source_url": webpage_url or source_url,
                },
            )
            update_task(
                task_id,
                notes_path=str(notes_dir),
                meta_patch={
                    "notes_dir": str(notes_dir),
                    "search_text": search_text[:2000],
                    "embedding_source": index_info.get("embedding_source"),
                },
            )

        raise_if_cancelled(task_id)

        # ----------------------------------------------------------------- #
        # 6. ANALYZE (post-hoc, template-driven)
        # ----------------------------------------------------------------- #
        analysis_count = 0
        if provider_ids and should_run_stage("analyzing", from_stage):
            update_task(task_id, status="analyzing", progress=88, message="running AI analysis")
            try:
                res = analyze_existing_task(task_id, provider_ids)
                analysis_count = int(res.get("analysis_count") or 0)
            except TaskCancelled:
                raise
            except Exception as exc:  # noqa: BLE001
                update_task(task_id, message=f"analysis error: {exc}")

        raise_if_cancelled(task_id)

        # ----------------------------------------------------------------- #
        # 7. CLEANUP + COMPLETE
        # ----------------------------------------------------------------- #
        cleanup_info = cleanup_media(
            work_dir=work_dir if source_type == "url" else None,
            video_path=video_path,
            source_type=source_type,
            auto_delete=auto_delete,
        )

        update_task(
            task_id,
            status="completed",
            progress=100,
            message="done" if not auto_delete else "done (video cleaned)",
            notes_path=str(notes_dir),
            meta_patch={
                "transcript_source": transcript_source,
                "keyframe_count": len(keyframes),
                "analysis_count": analysis_count,
                "cleanup": cleanup_info,
            },
        )
        return {"task_id": task_id, "notes_dir": str(notes_dir), "cleanup": cleanup_info}
    except TaskCancelled:
        update_task(task_id, status="cancelled", progress=100, message="cancelled")
        return {"task_id": task_id, "status": "cancelled"}
    except Exception as exc:  # noqa: BLE001
        update_task(task_id, status="failed", message="failed", error=str(exc))
        raise
