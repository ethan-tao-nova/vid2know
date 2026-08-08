from __future__ import annotations

import httpx


async def test_provider(
    *,
    ptype: str,
    base_url: str,
    api_key: str,
    model: str,
    timeout_seconds: int = 60,
) -> tuple[bool, str, str | None]:
    ptype = (ptype or "openai_compatible").lower()
    try:
        if ptype in ("openai_compatible", "openai"):
            return await _test_openai(base_url, api_key, model, timeout_seconds)
        if ptype == "anthropic":
            return await _test_anthropic(base_url, api_key, model, timeout_seconds)
        if ptype == "gemini":
            return await _test_gemini(base_url, api_key, model, timeout_seconds)
        return False, f"Unsupported provider type: {ptype}", None
    except Exception as exc:  # noqa: BLE001
        return False, str(exc), None


async def _test_openai(base_url: str, api_key: str, model: str, timeout: int):
    url = base_url.rstrip("/") + "/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {
        "model": model,
        "messages": [{"role": "user", "content": "Reply with OK"}],
        "max_tokens": 16,
        "temperature": 0,
    }
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(url, headers=headers, json=body)
        if r.status_code >= 400:
            return False, f"HTTP {r.status_code}: {r.text[:500]}", None
        data = r.json()
        text = data["choices"][0]["message"]["content"]
        return True, "ok", text


async def _test_anthropic(base_url: str, api_key: str, model: str, timeout: int):
    url = base_url.rstrip("/") + "/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": model,
        "max_tokens": 16,
        "messages": [{"role": "user", "content": "Reply with OK"}],
    }
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(url, headers=headers, json=body)
        if r.status_code >= 400:
            return False, f"HTTP {r.status_code}: {r.text[:500]}", None
        data = r.json()
        text = data["content"][0]["text"]
        return True, "ok", text


async def _test_gemini(base_url: str, api_key: str, model: str, timeout: int):
    # generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
    root = base_url.rstrip("/")
    if root.endswith("/v1beta"):
        url = f"{root}/models/{model}:generateContent"
    else:
        url = f"{root}/v1beta/models/{model}:generateContent"
    params = {"key": api_key}
    body = {"contents": [{"parts": [{"text": "Reply with OK"}]}]}
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(url, params=params, json=body)
        if r.status_code >= 400:
            return False, f"HTTP {r.status_code}: {r.text[:500]}", None
        data = r.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return True, "ok", text
