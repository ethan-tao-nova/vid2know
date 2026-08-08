from __future__ import annotations

import hashlib
import json
import math
import time
from pathlib import Path
from typing import Any

import httpx

from worker.pipeline.types import ensure_dir

_LOCAL_DIM = 256


def _cache_dir(cache_root: str | Path | None) -> Path:
    root = Path(cache_root) if cache_root else Path("data/cache")
    return ensure_dir(root)


def local_hash_embedding(text: str, dim: int = _LOCAL_DIM) -> list[float]:
    """Deterministic bag-of-tokens hashing embedding (no external calls).

    Tokens are hashed into ``dim`` buckets and the resulting vector is L2-normalized so
    cosine similarity between two local embeddings is meaningful. This provides an
    always-available fallback when no embeddings API is configured.
    """
    vec = [0.0] * dim
    if not text:
        return vec
    for token in text.split():
        token = token.strip().lower()
        if not token:
            continue
        h = hashlib.md5(token.encode("utf-8")).hexdigest()
        idx = int(h[:8], 16) % dim
        sign = 1.0 if int(h[8:10], 16) % 2 == 0 else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    return vec


def _api_embedding(provider: dict[str, Any], text: str) -> list[float] | None:
    """Fetch an embedding from an OpenAI-compatible ``/embeddings`` endpoint."""
    base_url = (provider.get("base_url") or "").rstrip("/")
    api_key = provider.get("api_key") or ""
    model = provider.get("embedding_model") or provider.get("default_model")
    if not base_url or not api_key or not model:
        return None
    url = base_url + "/embeddings"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {"model": model, "input": text[:8000]}
    timeout = float(provider.get("timeout_seconds") or 60)
    try:
        with httpx.Client(timeout=timeout) as client:
            r = client.post(url, headers=headers, json=body)
            r.raise_for_status()
            data = r.json()
            return list(data["data"][0]["embedding"])
    except Exception:
        return None


def upsert_embedding(
    task_id: str,
    text: str,
    *,
    cache_root: str | Path | None = None,
    provider: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Upsert an embedding record for ``task_id`` into ``data/cache/embeddings.jsonl``.

    Always stores a local hash embedding; when ``provider`` is given and reachable an API
    embedding is stored alongside it. Existing records for the same ``task_id`` are
    replaced (upsert semantics).
    """
    path = _cache_dir(cache_root) / "embeddings.jsonl"

    api_vec = _api_embedding(provider, text) if provider else None
    record = {
        "task_id": task_id,
        "updated_at": time.time(),
        "text_preview": (text or "")[:500],
        "local": local_hash_embedding(text),
        "embedding": api_vec,
        "embedding_source": "api" if api_vec else "local",
        "metadata": metadata or {},
    }

    existing: list[dict[str, Any]] = []
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            if item.get("task_id") != task_id:
                existing.append(item)
    existing.append(record)

    with path.open("w", encoding="utf-8") as f:
        for item in existing:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    return record


def build_search_text(
    title: str,
    transcript_text: str,
    ocr_snippets: list[str],
    *,
    max_chars: int = 20000,
) -> str:
    parts = [title or "", transcript_text or "", "\n".join(ocr_snippets or [])]
    return "\n".join(p for p in parts if p)[:max_chars]


def index_note(
    task_id: str,
    *,
    title: str,
    search_text: str,
    cache_root: str | Path | None = None,
    provider: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Write a lightweight search record and upsert the embedding for the task."""
    path = _cache_dir(cache_root) / "search_index.jsonl"
    record = {
        "task_id": task_id,
        "title": title,
        "search_text": search_text,
        "updated_at": time.time(),
        "metadata": metadata or {},
    }

    existing: list[dict[str, Any]] = []
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            if item.get("task_id") != task_id:
                existing.append(item)
    existing.append(record)
    with path.open("w", encoding="utf-8") as f:
        for item in existing:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    emb = upsert_embedding(
        task_id,
        search_text,
        cache_root=cache_root,
        provider=provider,
        metadata=metadata,
    )
    return {"search": record, "embedding_source": emb.get("embedding_source")}
