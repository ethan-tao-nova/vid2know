from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx
import yaml

from worker.db import ProviderConfig, SessionLocal
from worker.config import settings


DEFAULT_PROMPT = """你是视频笔记分析助手。根据下方转写与关键帧 OCR，输出结构化中文分析：
1. 一句话摘要
2. 核心知识点列表（条目清晰）
3. 操作步骤 / 流程（若适用）
4. 值得深入的问题
5. 风险与注意事项

要求：忠实于原文，不要编造视频中未出现的内容；使用 Markdown。
"""


def load_providers() -> list[dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {}
    path = Path(settings.providers_file)
    candidates = [
        path,
        Path("config/providers.yaml"),
        Path("config/providers.example.yaml"),
        Path("/config/providers.yaml"),
        Path("/config/providers.example.yaml"),
    ]
    for candidate in candidates:
        if candidate.exists():
            data = yaml.safe_load(candidate.read_text(encoding="utf-8")) or {}
            for p in data.get("providers") or []:
                by_id[p["id"]] = dict(p)
            break

    db = SessionLocal()
    try:
        for row in db.query(ProviderConfig).all():
            by_id[row.id] = {
                "id": row.id,
                "name": row.name,
                "type": row.type,
                "enabled": row.enabled,
                "base_url": row.base_url,
                "api_key": row.api_key_enc,
                "default_model": row.default_model,
                "temperature": row.temperature,
                "timeout_seconds": row.timeout_seconds,
            }
    finally:
        db.close()
    return list(by_id.values())


def resolve_providers(provider_ids: list[str]) -> list[dict[str, Any]]:
    all_p = {p["id"]: p for p in load_providers()}
    selected: list[dict[str, Any]] = []
    for pid in provider_ids:
        p = all_p.get(pid)
        if not p:
            continue
        if not p.get("enabled"):
            continue
        key = (p.get("api_key") or "").lower()
        if not key or "replace_me" in key or "your_key" in key:
            continue
        selected.append(p)
    return selected


def build_analysis_context(
    *,
    title: str,
    source_url: str | None,
    transcript_text: str,
    ocr_snippets: list[str],
    max_chars: int = 24000,
) -> str:
    parts = [
        f"标题: {title}",
        f"来源: {source_url or '本地上传'}",
        "",
        "## 转写",
        transcript_text[: max_chars // 2],
        "",
        "## 关键帧 OCR",
        "\n\n".join(ocr_snippets)[: max_chars // 2],
    ]
    return "\n".join(parts)[:max_chars]


def analyze_with_provider(provider: dict[str, Any], context: str) -> str:
    ptype = (provider.get("type") or "openai_compatible").lower()
    if ptype in ("openai_compatible", "openai"):
        return _chat_openai(provider, context)
    if ptype == "anthropic":
        return _chat_anthropic(provider, context)
    if ptype == "gemini":
        return _chat_gemini(provider, context)
    raise ValueError(f"Unsupported provider type: {ptype}")


def _chat_openai(provider: dict[str, Any], context: str) -> str:
    url = provider["base_url"].rstrip("/") + "/chat/completions"
    headers = {
        "Authorization": f"Bearer {provider['api_key']}",
        "Content-Type": "application/json",
    }
    body = {
        "model": provider.get("default_model"),
        "temperature": float(provider.get("temperature") or 0.3),
        "messages": [
            {"role": "system", "content": DEFAULT_PROMPT},
            {"role": "user", "content": context},
        ],
    }
    timeout = float(provider.get("timeout_seconds") or 120)
    with httpx.Client(timeout=timeout) as client:
        r = client.post(url, headers=headers, json=body)
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"]


def _chat_anthropic(provider: dict[str, Any], context: str) -> str:
    url = provider["base_url"].rstrip("/") + "/v1/messages"
    headers = {
        "x-api-key": provider["api_key"],
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": provider.get("default_model"),
        "max_tokens": 4096,
        "temperature": float(provider.get("temperature") or 0.3),
        "system": DEFAULT_PROMPT,
        "messages": [{"role": "user", "content": context}],
    }
    timeout = float(provider.get("timeout_seconds") or 120)
    with httpx.Client(timeout=timeout) as client:
        r = client.post(url, headers=headers, json=body)
        r.raise_for_status()
        data = r.json()
        return data["content"][0]["text"]


def _chat_gemini(provider: dict[str, Any], context: str) -> str:
    root = provider["base_url"].rstrip("/")
    model = provider.get("default_model")
    if root.endswith("/v1beta"):
        url = f"{root}/models/{model}:generateContent"
    else:
        url = f"{root}/v1beta/models/{model}:generateContent"
    params = {"key": provider["api_key"]}
    body = {
        "contents": [
            {
                "parts": [
                    {"text": DEFAULT_PROMPT + "\n\n" + context},
                ]
            }
        ]
    }
    timeout = float(provider.get("timeout_seconds") or 120)
    with httpx.Client(timeout=timeout) as client:
        r = client.post(url, params=params, json=body)
        r.raise_for_status()
        data = r.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
