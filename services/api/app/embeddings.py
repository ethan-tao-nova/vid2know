"""Lightweight embedding store for semantic task search.

Vectors are persisted as JSON Lines under ``CACHE_ROOT/embeddings.jsonl`` — one
record per task. By default embeddings are produced by a dependency-free hashing
encoder (:func:`local_embed`) so search works out of the box; when an embeddings
provider is configured the OpenAI-compatible ``/embeddings`` endpoint is used
instead.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import threading
from pathlib import Path
from typing import Any, Iterable

import httpx

from app.config import settings

LOCAL_DIM = 256
_LOCK = threading.Lock()
_TOKEN_RE = re.compile(r"[\w\u4e00-\u9fff]+", re.UNICODE)


def store_path() -> Path:
    root = Path(settings.cache_root)
    root.mkdir(parents=True, exist_ok=True)
    return root / "embeddings.jsonl"


def _tokenize(text: str) -> list[str]:
    tokens = _TOKEN_RE.findall((text or "").lower())
    # Add CJK bigrams so single-character-language search is more useful.
    bigrams: list[str] = []
    for tok in tokens:
        if len(tok) > 1 and any("\u4e00" <= ch <= "\u9fff" for ch in tok):
            bigrams.extend(tok[i : i + 2] for i in range(len(tok) - 1))
    return tokens + bigrams


def local_embed(text: str, dim: int = LOCAL_DIM) -> list[float]:
    """Deterministic hashing embedding — no external dependencies."""
    vec = [0.0] * dim
    for tok in _tokenize(text):
        h = int(hashlib.md5(tok.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if (h >> 8) & 1 else -1.0
        vec[idx] += sign
    return _normalize(vec)


def openai_embed(text: str, provider: dict[str, Any]) -> list[float]:
    """Embed via an OpenAI-compatible ``/embeddings`` endpoint."""
    base = (provider.get("base_url") or "").rstrip("/")
    model = provider.get("embedding_model") or provider.get("default_model") or "text-embedding-3-small"
    url = f"{base}/embeddings"
    headers = {
        "Authorization": f"Bearer {provider.get('api_key') or ''}",
        "Content-Type": "application/json",
    }
    timeout = float(provider.get("timeout_seconds") or 60)
    with httpx.Client(timeout=timeout) as client:
        r = client.post(url, headers=headers, json={"model": model, "input": text[:8000]})
        r.raise_for_status()
        data = r.json()
    return _normalize([float(x) for x in data["data"][0]["embedding"]])


def embed_text(text: str, provider: dict[str, Any] | None = None) -> tuple[list[float], str]:
    """Return ``(vector, model_label)``. Falls back to local on any error."""
    if provider and provider.get("api_key") and provider.get("base_url"):
        try:
            return openai_embed(text, provider), f"openai:{provider.get('id') or 'provider'}"
        except Exception:  # noqa: BLE001 — never let embeddings break the request
            pass
    return local_embed(text), "local"


def _normalize(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vec))
    if norm == 0:
        return vec
    return [v / norm for v in vec]


def cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    return sum(x * y for x, y in zip(a, b))


def _read_all() -> list[dict[str, Any]]:
    path = store_path()
    if not path.exists():
        return []
    records: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return records


def _write_all(records: Iterable[dict[str, Any]]) -> None:
    path = store_path()
    tmp = path.with_suffix(".jsonl.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    tmp.replace(path)


def upsert_embedding(
    task_id: str,
    text: str,
    *,
    vector: list[float] | None = None,
    model: str = "local",
    meta: dict[str, Any] | None = None,
) -> None:
    if vector is None:
        vector, model = embed_text(text)
    record = {
        "id": task_id,
        "model": model,
        "dim": len(vector),
        "text": (text or "")[:400],
        "vector": vector,
        "meta": meta or {},
    }
    with _LOCK:
        records = [r for r in _read_all() if r.get("id") != task_id]
        records.append(record)
        _write_all(records)


def delete_embedding(task_id: str) -> None:
    with _LOCK:
        records = _read_all()
        remaining = [r for r in records if r.get("id") != task_id]
        if len(remaining) != len(records):
            _write_all(remaining)


def search_embeddings(query: str, top_k: int = 20, provider: dict[str, Any] | None = None) -> list[tuple[str, float]]:
    """Return ``[(task_id, score), ...]`` ordered by descending cosine score."""
    records = _read_all()
    if not records:
        return []
    qvec, _ = embed_text(query, provider)
    scored: list[tuple[str, float]] = []
    for rec in records:
        vec = rec.get("vector") or []
        if len(vec) != len(qvec):
            continue
        scored.append((rec.get("id"), cosine(qvec, vec)))
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:top_k]
