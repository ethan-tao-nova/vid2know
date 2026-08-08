"""Convert a note's Markdown into DOCX and PDF.

These are intentionally simple converters that cover the subset of Markdown the
pipeline emits (headings, bullet/numbered lists, images, code fences, plain
paragraphs). They are not a full CommonMark implementation.
"""

from __future__ import annotations

import re
from pathlib import Path

from docx import Document
from docx.shared import Pt
from fpdf import FPDF

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
_BULLET_RE = re.compile(r"^\s*[-*]\s+(.*)$")
_ORDERED_RE = re.compile(r"^\s*(\d+)\.\s+(.*)$")
_IMAGE_RE = re.compile(r"!\[[^\]]*\]\(([^)]+)\)")
_INLINE_MD_RE = re.compile(r"[*_`]{1,3}")

# Fonts that ship with common base images and support CJK glyphs.
_CJK_FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def _strip_inline(text: str) -> str:
    return _INLINE_MD_RE.sub("", text).strip()


def markdown_to_docx(markdown: str, out_path: Path, base_dir: Path | None = None) -> Path:
    doc = Document()
    in_code = False
    code_lines: list[str] = []
    for raw in markdown.splitlines():
        line = raw.rstrip("\n")
        if line.strip().startswith("```"):
            if in_code:
                para = doc.add_paragraph()
                run = para.add_run("\n".join(code_lines))
                run.font.name = "Courier New"
                run.font.size = Pt(9)
                code_lines = []
            in_code = not in_code
            continue
        if in_code:
            code_lines.append(line)
            continue

        img = _IMAGE_RE.search(line)
        if img:
            rel = img.group(1)
            img_path = Path(rel)
            if base_dir and not img_path.is_absolute():
                img_path = base_dir / rel
            if img_path.exists():
                try:
                    doc.add_picture(str(img_path))
                    continue
                except Exception:  # noqa: BLE001
                    pass
            doc.add_paragraph(f"[image] {rel}")
            continue

        heading = _HEADING_RE.match(line)
        if heading:
            level = min(len(heading.group(1)), 6)
            doc.add_heading(_strip_inline(heading.group(2)), level=level)
            continue

        bullet = _BULLET_RE.match(line)
        if bullet:
            doc.add_paragraph(_strip_inline(bullet.group(1)), style="List Bullet")
            continue

        ordered = _ORDERED_RE.match(line)
        if ordered:
            doc.add_paragraph(_strip_inline(ordered.group(2)), style="List Number")
            continue

        if line.strip():
            doc.add_paragraph(_strip_inline(line))
        else:
            doc.add_paragraph("")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(out_path))
    return out_path


def _register_font(pdf: FPDF) -> tuple[str, set[str]]:
    """Register a unicode-capable font; returns ``(family, available_styles)``.

    The same font file is registered for regular/bold/italic variants so any
    requested style resolves without raising, even if the file has no real bold.
    """
    for candidate in _CJK_FONT_CANDIDATES:
        if not Path(candidate).exists():
            continue
        styles: set[str] = set()
        for style in ("", "B", "I", "BI"):
            try:
                pdf.add_font("note", style, candidate)
                styles.add(style)
            except Exception:  # noqa: BLE001
                continue
        if styles:
            return "note", styles
    # Built-in Helvetica supports all core styles (latin-1 only).
    return "Helvetica", {"", "B", "I", "BI"}


def markdown_to_pdf(markdown: str, out_path: Path, base_dir: Path | None = None) -> Path:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    font, styles = _register_font(pdf)
    unicode_ok = font != "Helvetica"

    def write(text: str, size: int = 11, style: str = "") -> None:
        effective = style if style in styles else ""
        pdf.set_font(font, effective, size)
        safe = text if unicode_ok else text.encode("latin-1", "replace").decode("latin-1")
        pdf.multi_cell(w=0, h=size * 0.6, text=safe, new_x="LMARGIN", new_y="NEXT")

    in_code = False
    for raw in markdown.splitlines():
        line = raw.rstrip("\n")
        if line.strip().startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            write(line, size=9)
            continue

        img = _IMAGE_RE.search(line)
        if img:
            rel = img.group(1)
            img_path = Path(rel)
            if base_dir and not img_path.is_absolute():
                img_path = base_dir / rel
            if img_path.exists() and img_path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif"}:
                try:
                    pdf.image(str(img_path), w=min(pdf.epw, 150))
                    pdf.ln(2)
                    continue
                except Exception:  # noqa: BLE001
                    pass
            write(f"[image] {rel}", size=9)
            continue

        heading = _HEADING_RE.match(line)
        if heading:
            level = len(heading.group(1))
            write(_strip_inline(heading.group(2)), size=max(18 - 2 * level, 11), style="B")
            continue

        bullet = _BULLET_RE.match(line)
        if bullet:
            write("• " + _strip_inline(bullet.group(1)))
            continue

        ordered = _ORDERED_RE.match(line)
        if ordered:
            write(f"{ordered.group(1)}. " + _strip_inline(ordered.group(2)))
            continue

        if line.strip():
            write(_strip_inline(line))
        else:
            pdf.ln(3)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(out_path))
    return out_path
