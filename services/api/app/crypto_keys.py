"""Symmetric encryption for provider API keys stored in the database.

Keys are encrypted with Fernet (AES-128-CBC + HMAC). The secret lives in a
file on disk (``FERNET_KEY_FILE`` / ``config/fernet.key``) and is auto-created
on first use so a fresh install works without manual setup.

Legacy rows that were written before encryption stored the API key as
plaintext. ``decrypt`` detects that case and returns the value unchanged so we
never lose an existing key during migration.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

# Fernet tokens are urlsafe-base64 and always start with the version byte
# 0x80, which base64-encodes to a leading "gAAAAA" prefix.
_FERNET_PREFIX = "gAAAAA"


def _key_path() -> Path:
    return Path(os.environ.get("FERNET_KEY_FILE") or settings.fernet_key_file)


def _load_or_create_key(path: Path) -> bytes:
    if path.exists():
        raw = path.read_bytes().strip()
        if raw:
            return raw
    path.parent.mkdir(parents=True, exist_ok=True)
    key = Fernet.generate_key()
    path.write_bytes(key)
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass
    return key


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    return Fernet(_load_or_create_key(_key_path()))


def reset_cache() -> None:
    """Drop the cached Fernet instance (useful after rotating the key file)."""
    _fernet.cache_clear()


def looks_encrypted(value: str | None) -> bool:
    if not value:
        return False
    return value.startswith(_FERNET_PREFIX)


def encrypt(plaintext: str | None) -> str:
    """Encrypt a secret. Empty input returns an empty string."""
    if not plaintext:
        return ""
    if looks_encrypted(plaintext):
        # Already an encrypted token — verify it decrypts, otherwise re-encrypt.
        try:
            _fernet().decrypt(plaintext.encode("utf-8"))
            return plaintext
        except InvalidToken:
            pass
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt(token: str | None) -> str:
    """Decrypt a token. Legacy plaintext values are returned unchanged."""
    if not token:
        return ""
    if not looks_encrypted(token):
        return token
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        # Corrupt/foreign token — return as-is rather than crashing.
        return token
