"""Built-in analysis prompt templates.

Each template carries multilingual labels (zh-CN / en / ja) plus the system
prompt used to steer the LLM. The worker consumes ``prompt`` when a task's
``meta["prompt_template"]`` matches an id here.
"""

from __future__ import annotations

from typing import Any

DEFAULT_TEMPLATE_ID = "illustrated"

TEMPLATES: list[dict[str, Any]] = [
    {
        "id": "illustrated",
        "labels": {
            "zh-CN": "图文精读",
            "en": "Illustrated notes",
            "ja": "図解ノート",
        },
        "description": {
            "zh-CN": "结合关键帧与转写，输出图文并茂的结构化笔记。",
            "en": "Rich structured notes combining keyframes and transcript.",
            "ja": "キーフレームと文字起こしを組み合わせた構造化ノート。",
        },
        "prompt": (
            "你是视频图文笔记助手。结合转写与关键帧 OCR，输出图文并茂的结构化中文笔记：\n"
            "1. 一句话摘要\n"
            "2. 章节小标题 + 要点（保留时间戳）\n"
            "3. 关键画面说明\n"
            "4. 术语表\n"
            "要求：忠实原文，使用 Markdown，不编造内容。"
        ),
    },
    {
        "id": "brief",
        "labels": {
            "zh-CN": "极简摘要",
            "en": "Brief summary",
            "ja": "簡潔な要約",
        },
        "description": {
            "zh-CN": "只输出核心结论与要点，尽量精简。",
            "en": "Only the core conclusions and key points, as concise as possible.",
            "ja": "核心的な結論と要点のみを簡潔に出力します。",
        },
        "prompt": (
            "你是摘要助手。请用最精简的中文输出：\n"
            "1. 三句话摘要\n"
            "2. 不超过 5 条核心要点\n"
            "要求：不展开、不举例，使用 Markdown 列表。"
        ),
    },
    {
        "id": "tutorial",
        "labels": {
            "zh-CN": "教程步骤",
            "en": "Tutorial steps",
            "ja": "チュートリアル手順",
        },
        "description": {
            "zh-CN": "把内容整理成可执行的操作步骤。",
            "en": "Turn the content into actionable, ordered steps.",
            "ja": "内容を実行可能な手順に整理します。",
        },
        "prompt": (
            "你是教程整理助手。把视频内容整理成可执行的操作步骤（中文）：\n"
            "1. 前置准备 / 环境\n"
            "2. 编号步骤（每步含目的与命令/操作）\n"
            "3. 常见错误与排查\n"
            "要求：步骤可复现，使用 Markdown 有序列表。"
        ),
    },
    {
        "id": "exam_points",
        "labels": {
            "zh-CN": "考点提炼",
            "en": "Exam points",
            "ja": "試験ポイント",
        },
        "description": {
            "zh-CN": "提炼考点、易错点与记忆锚点。",
            "en": "Extract exam points, pitfalls and memory hooks.",
            "ja": "試験のポイント・落とし穴・記憶のコツを抽出します。",
        },
        "prompt": (
            "你是备考助手。请从视频中提炼（中文）：\n"
            "1. 必考知识点\n"
            "2. 易错点与陷阱\n"
            "3. 记忆口诀 / 锚点\n"
            "4. 三道自测题（含答案）\n"
            "要求：条理清晰，使用 Markdown。"
        ),
    },
]

_BY_ID = {t["id"]: t for t in TEMPLATES}


def normalize_template_id(template_id: str | None) -> str:
    """Return a valid template id, falling back to the default."""
    if not template_id:
        return DEFAULT_TEMPLATE_ID
    tid = str(template_id).strip().lower()
    return tid if tid in _BY_ID else DEFAULT_TEMPLATE_ID


def get_template(template_id: str | None) -> dict[str, Any]:
    return _BY_ID[normalize_template_id(template_id)]
