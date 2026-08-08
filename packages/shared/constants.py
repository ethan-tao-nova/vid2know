"""Shared constants for Vid2Know services."""

TASK_STATUSES = (
    "pending",
    "downloading",
    "transcribing",
    "extracting_frames",
    "ocr",
    "assembling",
    "analyzing",
    "completed",
    "failed",
)

DEFAULT_ANALYSIS_PROMPT_ZH = """你是视频笔记分析助手。根据下方转写与关键帧 OCR，输出结构化中文分析：
1. 一句话摘要
2. 核心知识点列表（条目清晰）
3. 操作步骤 / 流程（若适用）
4. 值得深入的问题
5. 风险与注意事项

要求：忠实于原文，不要编造视频中未出现的内容；使用 Markdown。
"""
