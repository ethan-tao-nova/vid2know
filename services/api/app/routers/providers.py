from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai_test import test_provider
from app.db import get_db
from app.providers import get_provider, providers_public, upsert_provider
from app.schemas import ProviderOut, ProviderTestRequest, ProviderTestResult, ProviderUpsert

router = APIRouter(prefix="/api/providers", tags=["providers"])


@router.get("", response_model=list[ProviderOut])
def list_providers(db: Session = Depends(get_db)):
    return providers_public(db)


@router.put("", response_model=ProviderOut)
def save_provider(body: ProviderUpsert, db: Session = Depends(get_db)):
    upsert_provider(db, body.model_dump())
    items = providers_public(db)
    for item in items:
        if item["id"] == body.id:
            return item
    raise HTTPException(500, "Failed to save provider")


@router.post("/test", response_model=ProviderTestResult)
async def test_provider_endpoint(body: ProviderTestRequest, db: Session = Depends(get_db)):
    api_key = body.api_key
    base_url = body.base_url
    model = body.default_model
    ptype = body.type
    if body.id and (not api_key or api_key.startswith("***")):
        existing = get_provider(db, body.id)
        if not existing:
            raise HTTPException(404, "Provider not found")
        api_key = existing.get("api_key") or ""
        base_url = base_url or existing.get("base_url") or ""
        model = model or existing.get("default_model") or ""
        ptype = ptype or existing.get("type") or "openai_compatible"
    ok, message, sample = await test_provider(
        ptype=ptype,
        base_url=base_url,
        api_key=api_key,
        model=model,
        timeout_seconds=body.timeout_seconds,
    )
    return ProviderTestResult(ok=ok, message=message, sample=sample)
