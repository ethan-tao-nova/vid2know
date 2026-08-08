"""Normalize video URLs so the same source is only ingested once.

The canonical form strips tracking/query noise and reduces platform URLs to a
stable identity:

* Bilibili -> ``https://www.bilibili.com/video/<BV...>`` (optionally ``?p=N``)
* YouTube  -> ``https://www.youtube.com/watch?v=<id>``

Any other URL is lower-cased on host, stripped of common tracking params and
trailing slashes.
"""

from __future__ import annotations

import re
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

_TRACKING_PARAMS = {
    "spm_id_from",
    "vd_source",
    "from_source",
    "from_spmid",
    "share_source",
    "share_medium",
    "share_plat",
    "share_tag",
    "share_session_id",
    "unique_k",
    "buvid",
    "seid",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "feature",
    "si",
    "pp",
    "ab_channel",
    "gclid",
    "fbclid",
}

_BV_RE = re.compile(r"(BV[0-9A-Za-z]{10})")
_AV_RE = re.compile(r"av(\d+)", re.IGNORECASE)


def _clean_query(query: str) -> dict[str, list[str]]:
    params = parse_qs(query, keep_blank_values=False)
    return {k: v for k, v in params.items() if k.lower() not in _TRACKING_PARAMS}


def _normalize_bilibili(parsed, params: dict[str, list[str]]) -> str | None:
    path = parsed.path
    bv = _BV_RE.search(path) or _BV_RE.search(parsed.query)
    identity = None
    if bv:
        identity = f"/video/{bv.group(1)}"
    else:
        av = _AV_RE.search(path)
        if av:
            identity = f"/video/av{av.group(1)}"
    if not identity:
        return None
    query = ""
    if "p" in params:
        try:
            page = int(params["p"][0])
            if page > 1:
                query = urlencode({"p": page})
        except (ValueError, IndexError):
            pass
    return urlunparse(("https", "www.bilibili.com", identity, "", query, ""))


def _normalize_youtube(parsed, params: dict[str, list[str]]) -> str | None:
    host = parsed.netloc.lower()
    vid = None
    if "youtu.be" in host:
        vid = parsed.path.strip("/").split("/")[0] or None
    elif "/shorts/" in parsed.path:
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) >= 2:
            vid = parts[1]
    elif "/embed/" in parsed.path:
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) >= 2:
            vid = parts[1]
    elif "v" in params:
        vid = params["v"][0]
    if not vid:
        return None
    return urlunparse(("https", "www.youtube.com", "/watch", "", urlencode({"v": vid}), ""))


def normalize_video_url(url: str | None) -> str:
    """Return a canonical, dedup-friendly URL. Empty input returns ``""``."""
    if not url or not url.strip():
        return ""
    raw = url.strip()
    if "://" not in raw:
        raw = "https://" + raw
    parsed = urlparse(raw)
    host = parsed.netloc.lower()
    params = _clean_query(parsed.query)

    if "bilibili.com" in host:
        result = _normalize_bilibili(parsed, params)
        if result:
            return result
    if "youtube.com" in host or "youtu.be" in host:
        result = _normalize_youtube(parsed, params)
        if result:
            return result

    scheme = parsed.scheme or "https"
    path = parsed.path.rstrip("/") or "/"
    query = urlencode({k: v[0] for k, v in sorted(params.items())}) if params else ""
    return urlunparse((scheme, host, path, "", query, ""))
