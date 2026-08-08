from __future__ import annotations

import os
from pathlib import Path

try:  # cryptography is optional at import time; decrypt degrades gracefully.
    from cryptography.fernet import Fernet, InvalidToken
except Exception:  # pragma: no cover - only when dependency missing
    Fernet = None  # type: ignore[assignment]
    InvalidToken = Exception  # type: ignore[assignment]


_DEFAULT_KEY_FILE = "/config/fernet.key"

_cached_fernet: "Fernet | None" = None
_cached_key_path: str | None = None


def _key_file() -> str:
    return os.environ.get("FERNET_KEY_FILE") or _DEFAULT_KEY_FILE


def load_fernet() -> "Fernet | None":
    """Load a :class:`Fernet` from the shared key file, mirroring the API service.

    Returns ``None`` when cryptography is unavailable or the key file is missing so
    callers can transparently fall back to treating stored values as plaintext.
    """
    global _cached_fernet, _cached_key_path
    if Fernet is None:
        return None
    key_path = _key_file()
    if _cached_fernet is not None and _cached_key_path == key_path:
        return _cached_fernet
    path = Path(key_path)
    if not path.exists():
        return None
    try:
        key = path.read_bytes().strip()
        fernet = Fernet(key)
    except Exception:
        return None
    _cached_fernet = fernet
    _cached_key_path = key_path
    return fernet


def decrypt_maybe(value: str | None) -> str:
    """Decrypt a Fernet token, returning the plaintext.

    Values that are empty, not valid Fernet tokens, or that cannot be decrypted with
    the available key are returned unchanged. This keeps the worker compatible with
    provider rows that still store plaintext API keys.
    """
    if not value:
        return ""
    fernet = load_fernet()
    if fernet is None:
        return value
    try:
        return fernet.decrypt(value.encode("utf-8")).decode("utf-8")
    except (InvalidToken, ValueError, TypeError):
        return value


def encrypt(value: str) -> str:
    """Encrypt plaintext with the shared key; returns plaintext when no key available."""
    if not value:
        return ""
    fernet = load_fernet()
    if fernet is None:
        return value
    return fernet.encrypt(value.encode("utf-8")).decode("utf-8")
