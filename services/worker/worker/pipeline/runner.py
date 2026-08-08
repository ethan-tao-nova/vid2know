from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

from worker.ai.hub import analyze_with_provider, build_analysis_context, resolve_providers
from worker.db import SessionLocal, Task
from worker.pipeline.assemble import append_analysis_index, write_meta, write_note_md, write_transcript_md
from worker.pipeline.download import cleanup_media, download_media
from worker.pipeline.frames import extract_keyframes
from worker.pipeline.ocr import apply_ocr
from worker.pipeline.transcript import get_transcript
from worker.pipeline.types import PipelineResult, ensure_dir, format_ts, slugify
from worker.task_store import runtime_settings, update_task


def process_video_task(task_id: str) -> dict:
    db = SessionLocal()
    try:
        task = db.get(Task, task_id)
        if not task:
            raise RuntimeError(f"task {task_id} not found")
        source_type = task.source_type
        source_url = task.source_url
        upload_path = (task.meta or {}).get("upload_path")
        provider_ids = list(task.provider_ids or [])
    finally:
        db.close()

    cfg = runtime_settings()
    # video_cache_root overrides cache_root when set in settings UI
    cache_root = Path(cfg.get("video_cache_root") or cfg["cache_root"])
    notes_root = Path(cfg["notes_root"])
    auto_delete = bool(cfg.get("auto_delete_video", True))
    work_dir = ensure_dir(cache_root / task_id)
    video_path = ""

    try:
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

        update_task(task_id, title=title, progress=20, message="transcribing")

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

        update_task(task_id, status="extracting_frames", progress=45, message="extracting keyframes")
        date_prefix = datetime.now().strftime("%Y%m%d")
        notes_dir = ensure_dir(notes_root / f"{date_prefix}_{slugify(title)}_{task_id[:8]}")
        images_dir = ensure_dir(notes_dir / "images")
        analysis_dir = ensure_dir(notes_dir / "analysis")

        keyframes = extract_keyframes(
            video_path,
            images_dir,
            threshold=float(cfg.get("scene_threshold") or 27.0),
            max_frames=int(cfg.get("max_keyframes") or 80),
        )

        update_task(task_id, status="ocr", progress=65, message="running OCR")
        keyframes = apply_ocr(keyframes, enabled=bool(cfg.get("ocr_enabled", True)))

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
                "versions": {
                    "pipeline": "0.1.1",
                },
            },
        )

        update_task(task_id, status="assembling", progress=80, message="writing markdown")
        write_transcript_md(notes_dir / "transcript.md", segments)
        write_note_md(result)
        write_meta(result)
        update_task(task_id, notes_path=str(notes_dir), meta_patch={"notes_dir": str(notes_dir)})

        analysis_links: list[tuple[str, str]] = []
        providers = resolve_providers(provider_ids)
        if providers:
            update_task(task_id, status="analyzing", progress=88, message="running AI analysis")
            transcript_text = "\n".join(
                f"[{format_ts(s.start)}] {s.text}" for s in segments
            )
            ocr_snippets = [
                f"[{format_ts(fr.time)}]\n{fr.ocr_text}" for fr in keyframes if fr.ocr_text
            ]
            context = build_analysis_context(
                title=title,
                source_url=webpage_url or source_url,
                transcript_text=transcript_text,
                ocr_snippets=ocr_snippets,
            )

            def _run_one(provider: dict) -> tuple[str, str, str, bool, str]:
                safe_name = slugify(provider.get("default_model") or provider["id"])
                out_rel = f"analysis/{safe_name}.md"
                label = f"{provider.get('name')} ({provider.get('default_model')})"
                try:
                    content = analyze_with_provider(provider, context)
                    return label, out_rel, content, True, ""
                except Exception as exc:  # noqa: BLE001
                    return f"{provider.get('name')} (failed)", out_rel, "", False, str(exc)

            with ThreadPoolExecutor(max_workers=min(4, len(providers))) as pool:
                futures = [pool.submit(_run_one, p) for p in providers]
                for fut in as_completed(futures):
                    label, out_rel, content, ok, err = fut.result()
                    out_path = notes_dir / out_rel
                    if ok:
                        out_path.write_text(
                            f"# AI 分析 — {label}\n\n{content}\n",
                            encoding="utf-8",
                        )
                    else:
                        out_path.write_text(
                            f"# AI 分析失败 — {label}\n\n```\n{err}\n```\n",
                            encoding="utf-8",
                        )
                    analysis_links.append((label, out_rel))

            append_analysis_index(notes_dir / "note.md", analysis_links)
            analysis_dir.mkdir(parents=True, exist_ok=True)

        # Delete temporary video after successful note generation.
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
                "analysis_count": len(analysis_links),
                "cleanup": cleanup_info,
            },
        )
        return {"task_id": task_id, "notes_dir": str(notes_dir), "cleanup": cleanup_info}
    except Exception as exc:  # noqa: BLE001
        update_task(task_id, status="failed", message="failed", error=str(exc))
        raise
