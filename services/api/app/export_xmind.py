"""Build an ``.xmind`` mind map (XMind Zen / JSON format) from Markdown.

Markdown headings define the topic hierarchy; bullet and numbered list items
become leaf topics under the most recent heading. An ``.xmind`` file is a zip
archive containing ``content.json``, ``metadata.json`` and ``manifest.json``.
"""

from __future__ import annotations

import json
import re
import uuid
import zipfile
from pathlib import Path
from typing import Any

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
_BULLET_RE = re.compile(r"^\s*[-*]\s+(.*)$")
_ORDERED_RE = re.compile(r"^\s*\d+\.\s+(.*)$")
_INLINE_MD_RE = re.compile(r"[*_`]{1,3}|!\[[^\]]*\]\([^)]*\)|\[([^\]]*)\]\([^)]*\)")


def _clean(text: str) -> str:
    text = _INLINE_MD_RE.sub(lambda m: m.group(1) or "", text)
    return text.strip()


def _new_topic(title: str) -> dict[str, Any]:
    return {"id": uuid.uuid4().hex, "title": title or "Untitled", "children": {"attached": []}}


def _attach(parent: dict[str, Any], child: dict[str, Any]) -> None:
    parent["children"]["attached"].append(child)


def markdown_to_topic_tree(markdown: str, root_title: str = "Note") -> dict[str, Any]:
    root = _new_topic(root_title)
    # Stack of (heading_level, topic); level 0 is the root.
    stack: list[tuple[int, dict[str, Any]]] = [(0, root)]

    for raw in markdown.splitlines():
        line = raw.rstrip()
        if not line.strip() or line.strip().startswith("```"):
            continue

        heading = _HEADING_RE.match(line)
        if heading:
            level = len(heading.group(1))
            topic = _new_topic(_clean(heading.group(2)))
            while len(stack) > 1 and stack[-1][0] >= level:
                stack.pop()
            _attach(stack[-1][1], topic)
            stack.append((level, topic))
            continue

        item = _BULLET_RE.match(line) or _ORDERED_RE.match(line)
        if item:
            text = _clean(item.group(1))
            if text:
                _attach(stack[-1][1], _new_topic(text))

    return root


def markdown_to_xmind(markdown: str, out_path: Path, title: str = "Note") -> Path:
    root_topic = markdown_to_topic_tree(markdown, root_title=title)
    content = [
        {
            "id": uuid.uuid4().hex,
            "class": "sheet",
            "title": title,
            "rootTopic": root_topic,
        }
    ]
    metadata = {"creator": {"name": "Vid2Know", "version": "1.0"}}
    manifest = {"file-entries": {"content.json": {}, "metadata.json": {}}}

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("content.json", json.dumps(content, ensure_ascii=False))
        zf.writestr("metadata.json", json.dumps(metadata, ensure_ascii=False))
        zf.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False))
    return out_path
