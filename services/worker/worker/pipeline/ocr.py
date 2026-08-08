from __future__ import annotations

from worker.pipeline.types import Keyframe


_ocr_engine = None


def _get_ocr():
    global _ocr_engine
    if _ocr_engine is not None:
        return _ocr_engine
    try:
        from paddleocr import PaddleOCR

        _ocr_engine = PaddleOCR(use_angle_cls=True, lang="ch", show_log=False)
    except Exception:
        _ocr_engine = False
    return _ocr_engine


def ocr_image(path: str) -> str:
    engine = _get_ocr()
    if not engine:
        return ""
    try:
        result = engine.ocr(path, cls=True)
    except Exception:
        return ""
    lines: list[str] = []
    if not result:
        return ""
    for block in result:
        if not block:
            continue
        for line in block:
            try:
                text = line[1][0]
                conf = float(line[1][1])
            except Exception:
                continue
            if text and conf >= 0.5:
                lines.append(text.strip())
    # de-dup consecutive
    cleaned: list[str] = []
    for ln in lines:
        if not cleaned or cleaned[-1] != ln:
            cleaned.append(ln)
    return "\n".join(cleaned)


def apply_ocr(frames: list[Keyframe], enabled: bool = True) -> list[Keyframe]:
    if not enabled:
        return frames
    for fr in frames:
        fr.ocr_text = ocr_image(fr.path)
    return frames
