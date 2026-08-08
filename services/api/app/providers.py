from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from sqlalchemy.orm import Session

from app.config import settings
from app.crypto_keys import decrypt, encrypt
from app.models import ProviderConfig

# Extended provider fields kept in ProviderConfig.extra (JSONB).
_EXTRA_FIELDS = (
    "group",
    "models",
    "max_tokens",
    "top_p",
    "frequency_penalty",
    "presence_penalty",
    "system_prompt",
)


def _mask(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return "*" * len(key)
    return key[:4] + "…" + key[-4:]


def _has_real_key(key: str) -> bool:
    if not key:
        return False
    lowered = key.lower()
    if "replace_me" in lowered or "your_key" in lowered or "changeme" in lowered:
        return False
    return True


def load_file_providers() -> list[dict[str, Any]]:
    path = Path(settings.providers_file)
    if not path.exists():
        example = Path("/config/providers.example.yaml")
        # local/dev fallback
        for candidate in (
            path,
            Path("config/providers.yaml"),
            Path("config/providers.example.yaml"),
            example,
        ):
            if candidate.exists():
                path = candidate
                break
        else:
            return []
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return list(data.get("providers") or [])


def merge_providers(db: Session) -> list[dict[str, Any]]:
    """File providers as base; DB rows override by id."""
    by_id: dict[str, dict[str, Any]] = {}
    for p in load_file_providers():
        item = dict(p)
        item.setdefault("api_key", "")
        item["source"] = "file"
        by_id[item["id"]] = item

    for row in db.query(ProviderConfig).all():
        by_id[row.id] = {
            "id": row.id,
            "name": row.name,
            "type": row.type,
            "enabled": row.enabled,
            "base_url": row.base_url,
            "api_key": decrypt(row.api_key_enc),
            "default_model": row.default_model,
            "temperature": row.temperature,
            "timeout_seconds": row.timeout_seconds,
            "source": "db",
            **(row.extra or {}),
        }
    return list(by_id.values())


def providers_public(db: Session) -> list[dict[str, Any]]:
    out = []
    for p in merge_providers(db):
        key = p.get("api_key") or ""
        real = _has_real_key(key)
        out.append(
            {
                "id": p["id"],
                "name": p.get("name") or p["id"],
                "type": p.get("type") or "openai_compatible",
                "enabled": bool(p.get("enabled")),
                "base_url": p.get("base_url") or "",
                "default_model": p.get("default_model") or "",
                "temperature": float(p.get("temperature") or 0.3),
                "timeout_seconds": int(p.get("timeout_seconds") or 120),
                "has_api_key": real,
                "api_key_masked": _mask(key) if real else "",
                "group": p.get("group") or "",
                "models": list(p.get("models") or []),
                "max_tokens": p.get("max_tokens"),
                "top_p": p.get("top_p"),
                "frequency_penalty": p.get("frequency_penalty"),
                "presence_penalty": p.get("presence_penalty"),
                "system_prompt": p.get("system_prompt") or "",
                "source": p.get("source") or "db",
            }
        )
    return out


def get_provider(db: Session, provider_id: str) -> dict[str, Any] | None:
    for p in merge_providers(db):
        if p["id"] == provider_id:
            return p
    return None


def upsert_provider(db: Session, payload: dict[str, Any]) -> ProviderConfig:
    row = db.get(ProviderConfig, payload["id"])
    if row is None:
        row = ProviderConfig(id=payload["id"])
        db.add(row)
    row.name = payload["name"]
    row.type = payload.get("type") or "openai_compatible"
    row.enabled = bool(payload.get("enabled"))
    row.base_url = payload.get("base_url") or ""
    if payload.get("api_key") is not None and payload.get("api_key") != "":
        row.api_key_enc = encrypt(payload["api_key"])
    elif not row.api_key_enc:
        # keep existing or pull from file (file keys are plaintext -> encrypt)
        file_p = next((x for x in load_file_providers() if x.get("id") == payload["id"]), None)
        if file_p and file_p.get("api_key"):
            row.api_key_enc = encrypt(file_p["api_key"])
    row.default_model = payload.get("default_model") or ""
    row.temperature = float(payload.get("temperature") or 0.3)
    row.timeout_seconds = int(payload.get("timeout_seconds") or 120)

    extra = dict(row.extra or {})
    for field in _EXTRA_FIELDS:
        if field in payload and payload[field] not in (None, "", []):
            extra[field] = payload[field]
    row.extra = extra

    db.commit()
    db.refresh(row)
    return row


def save_providers_file(providers: list[dict[str, Any]]) -> None:
    path = Path(settings.providers_file)
    path.parent.mkdir(parents=True, exist_ok=True)
    # redact nothing when writing user-managed file on purpose
    path.write_text(
        yaml.safe_dump({"providers": providers}, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )
