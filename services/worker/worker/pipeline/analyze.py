from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

from worker.ai.hub import (
    build_analysis_context,
    analyze_with_provider,
    resolve_providers,
)
from worker.ai.illustrated import (
    NoteScene,
    build_illustrated_document,
    load_scenes_from_notes_dir,
    scenes_to_context_block,
)
from worker.ai.prompt_templates import compare_prompt_for_template, prompt_for_template
from worker.db import SessionLocal, Task
from worker.pipeline.assemble import append_analysis_index
from worker.pipeline.types import ensure_dir, slugify
from worker.task_store import runtime_settings, update_task


def _resolve_notes_dir(meta: dict[str, Any], notes_path: str | None) -> Path | None:
    candidate = meta.get("notes_dir") or notes_path
    if not candidate:
        return None
    path = Path(candidate)
    return path if path.exists() else None


def _read_transcript(notes_dir: Path) -> str:
    for name in ("transcript.md", "transcript.txt"):
        p = notes_dir / name
        if p.exists():
            return p.read_text(encoding="utf-8", errors="ignore")
    return ""


def analyze_existing_task(task_id: str, provider_ids: list[str] | None = None) -> dict[str, Any]:
    """Run AI analysis over an already-generated note directory (post-hoc).

    Reads the transcript and keyframe scenes from the note directory, applies the prompt
    template recorded in ``task.meta.prompt_template``, runs each selected provider,
    collects token usage, and writes illustrated ``analysis/*.md`` documents.
    """
    db = SessionLocal()
    try:
        task = db.get(Task, task_id)
        if not task:
            raise RuntimeError(f"task {task_id} not found")
        meta = dict(task.meta or {})
        title = task.title or meta.get("title") or "分析"
        notes_path = task.notes_path
        ids = list(provider_ids if provider_ids is not None else (task.provider_ids or []))
    finally:
        db.close()

    notes_dir = _resolve_notes_dir(meta, notes_path)
    if notes_dir is None:
        raise RuntimeError("note directory not found for task")

    providers = resolve_providers(ids)
    if not providers:
        update_task(task_id, message="no usable providers for analysis")
        return {"task_id": task_id, "analysis_count": 0, "usage": {}}

    cfg = runtime_settings()
    locale = meta.get("analysis_language") or cfg.get("analysis_language") or cfg.get("default_locale")
    template_id = meta.get("prompt_template") or "illustrated"

    scenes: list[NoteScene] = load_scenes_from_notes_dir(notes_dir)
    transcript_text = _read_transcript(notes_dir)
    scene_block = scenes_to_context_block(scenes) if scenes else ""

    context = build_analysis_context(
        title=title,
        source_url=meta.get("source_url"),
        transcript_text=transcript_text,
        ocr_snippets=[scene_block] if scene_block else [],
    )

    multi = len(providers) > 1
    system_prompt = (
        compare_prompt_for_template(template_id, locale)
        if multi
        else prompt_for_template(template_id, locale)
    )

    ensure_dir(notes_dir / "analysis")

    def _run_one(provider: dict[str, Any]) -> dict[str, Any]:
        safe_name = slugify(provider.get("default_model") or provider["id"])
        out_rel = f"analysis/{safe_name}.md"
        label = f"{provider.get('name')} ({provider.get('default_model')})"
        try:
            result = analyze_with_provider(provider, context, system_prompt=system_prompt)
            doc = build_illustrated_document(
                title=f"AI 分析 — {label}",
                ai_body=result.content,
                scenes=scenes,
                header_note=f"模板: {template_id} · 语言: {locale}",
            )
            return {
                "label": label,
                "out_rel": out_rel,
                "content": doc,
                "ok": True,
                "error": "",
                "usage": result.usage,
                "provider_id": provider["id"],
            }
        except Exception as exc:  # noqa: BLE001
            return {
                "label": f"{provider.get('name')} (failed)",
                "out_rel": out_rel,
                "content": "",
                "ok": False,
                "error": str(exc),
                "usage": {},
                "provider_id": provider["id"],
            }

    analysis_links: list[tuple[str, str]] = []
    usage_by_provider: dict[str, Any] = {}
    ok_count = 0

    with ThreadPoolExecutor(max_workers=min(4, len(providers))) as pool:
        futures = [pool.submit(_run_one, p) for p in providers]
        for fut in as_completed(futures):
            res = fut.result()
            out_path = notes_dir / res["out_rel"]
            if res["ok"]:
                out_path.write_text(res["content"], encoding="utf-8")
                usage_by_provider[res["provider_id"]] = res["usage"]
                ok_count += 1
            else:
                out_path.write_text(
                    f"# AI 分析失败 — {res['label']}\n\n```\n{res['error']}\n```\n",
                    encoding="utf-8",
                )
            analysis_links.append((res["label"], res["out_rel"]))

    append_analysis_index(notes_dir / "note.md", analysis_links)

    total_tokens = 0
    for u in usage_by_provider.values():
        if isinstance(u, dict) and u.get("total_tokens"):
            total_tokens += int(u["total_tokens"])

    update_task(
        task_id,
        message="analysis complete",
        meta_patch={
            "analysis_count": ok_count,
            "analysis_template": template_id,
            "usage": usage_by_provider,
            "usage_total_tokens": total_tokens,
        },
    )

    return {
        "task_id": task_id,
        "analysis_count": ok_count,
        "usage": usage_by_provider,
        "usage_total_tokens": total_tokens,
    }
