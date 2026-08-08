from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import httpx
import yaml

from worker.config import settings
from worker.crypto_keys import decrypt_maybe
from worker.db import ProviderConfig, SessionLocal


DEFAULT_PROMPT = """你是视频笔记分析助手。根据下方转写与关键帧 OCR，输出结构化中文分析：
1. 一句话摘要
2. 核心知识点列表（条目清晰）
3. 操作步骤 / 流程（若适用）
4. 值得深入的问题
5. 风险与注意事项

要求：忠实于原文，不要编造视频中未出现的内容；使用 Markdown。
"""


@dataclass
class AnalyzeResult:
    content: str
    usage: dict[str, Any] = field(default_factory=dict)


def _is_zh(locale: str | None) -> bool:
    return (locale or "zh-CN").lower().startswith("zh")


def prompt_for_language(locale: str | None = None) -> str:
    """System prompt for single-model analysis, localized by ``locale``."""
    if _is_zh(locale):
        return DEFAULT_PROMPT
    return (
        "You are a video-note analysis assistant. Based on the transcript and keyframe OCR "
        "below, produce a structured analysis in English:\n"
        "1. One-sentence summary\n"
        "2. Core knowledge points (clear bullets)\n"
        "3. Steps / workflow (if applicable)\n"
        "4. Questions worth exploring\n"
        "5. Risks and caveats\n\n"
        "Requirements: stay faithful to the source, do not invent content not present in the "
        "video; use Markdown."
    )


def compare_prompt_for_language(locale: str | None = None) -> str:
    """System prompt for multi-model comparison runs, localized by ``locale``."""
    base = prompt_for_language(locale)
    if _is_zh(locale):
        return base + "\n\n本次为多模型对比：请保持结构一致以便横向比较。"
    return base + "\n\nThis is a multi-model comparison: keep the structure consistent for comparison."


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
                item = dict(p)
                item["api_key"] = decrypt_maybe(item.get("api_key"))
                by_id[item["id"]] = item
            break

    db = SessionLocal()
    try:
        for row in db.query(ProviderConfig).all():
            extra = dict(row.extra or {})
            by_id[row.id] = {
                "id": row.id,
                "name": row.name,
                "type": row.type,
                "enabled": row.enabled,
                "base_url": row.base_url,
                "api_key": decrypt_maybe(row.api_key_enc),
                "default_model": row.default_model,
                "temperature": row.temperature,
                "timeout_seconds": row.timeout_seconds,
                **extra,
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


def analyze_with_provider(
    provider: dict[str, Any],
    context: str,
    *,
    system_prompt: str | None = None,
) -> AnalyzeResult:
    """Run a single provider and return content plus token usage.

    ``system_prompt`` overrides :data:`DEFAULT_PROMPT` and is where template / language
    prompts are injected by callers.
    """
    prompt = system_prompt or DEFAULT_PROMPT
    ptype = (provider.get("type") or "openai_compatible").lower()
    if ptype in ("openai_compatible", "openai"):
        return _chat_openai(provider, context, prompt)
    if ptype == "anthropic":
        return _chat_anthropic(provider, context, prompt)
    if ptype == "gemini":
        return _chat_gemini(provider, context, prompt)
    raise ValueError(f"Unsupported provider type: {ptype}")


def _openai_usage(data: dict[str, Any]) -> dict[str, Any]:
    usage = data.get("usage") or {}
    return {
        "prompt_tokens": usage.get("prompt_tokens"),
        "completion_tokens": usage.get("completion_tokens"),
        "total_tokens": usage.get("total_tokens"),
    }


def _chat_openai(provider: dict[str, Any], context: str, system_prompt: str) -> AnalyzeResult:
    url = provider["base_url"].rstrip("/") + "/chat/completions"
    headers = {
        "Authorization": f"Bearer {provider['api_key']}",
        "Content-Type": "application/json",
    }
    body = {
        "model": provider.get("default_model"),
        "temperature": float(provider.get("temperature") or 0.3),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": context},
        ],
    }
    timeout = float(provider.get("timeout_seconds") or 120)
    with httpx.Client(timeout=timeout) as client:
        r = client.post(url, headers=headers, json=body)
        r.raise_for_status()
        data = r.json()
        content = data["choices"][0]["message"]["content"]
        return AnalyzeResult(content=content, usage=_openai_usage(data))


def _chat_anthropic(provider: dict[str, Any], context: str, system_prompt: str) -> AnalyzeResult:
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
        "system": system_prompt,
        "messages": [{"role": "user", "content": context}],
    }
    timeout = float(provider.get("timeout_seconds") or 120)
    with httpx.Client(timeout=timeout) as client:
        r = client.post(url, headers=headers, json=body)
        r.raise_for_status()
        data = r.json()
        content = data["content"][0]["text"]
        raw = data.get("usage") or {}
        input_tokens = raw.get("input_tokens")
        output_tokens = raw.get("output_tokens")
        total = None
        if input_tokens is not None or output_tokens is not None:
            total = (input_tokens or 0) + (output_tokens or 0)
        usage = {
            "prompt_tokens": input_tokens,
            "completion_tokens": output_tokens,
            "total_tokens": total,
        }
        return AnalyzeResult(content=content, usage=usage)


def _chat_gemini(provider: dict[str, Any], context: str, system_prompt: str) -> AnalyzeResult:
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
                    {"text": system_prompt + "\n\n" + context},
                ]
            }
        ]
    }
    timeout = float(provider.get("timeout_seconds") or 120)
    with httpx.Client(timeout=timeout) as client:
        r = client.post(url, params=params, json=body)
        r.raise_for_status()
        data = r.json()
        content = data["candidates"][0]["content"]["parts"][0]["text"]
        meta = data.get("usageMetadata") or {}
        usage = {
            "prompt_tokens": meta.get("promptTokenCount"),
            "completion_tokens": meta.get("candidatesTokenCount"),
            "total_tokens": meta.get("totalTokenCount"),
        }
        return AnalyzeResult(content=content, usage=usage)
