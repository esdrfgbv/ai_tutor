from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class StructuredBlock:
    content_type: str
    text: str
    page_number: int
    bbox: list[float] | None = None
    confidence: float = 0.0
    is_garbage: bool = False
    table_rows: list[list[str]] | None = None
    table_columns: list[str] | None = None
    image_path: str | None = None
    image_description: str | None = None
    formula_latex: str | None = None
    question_number: int | None = None
    options: list[str] | None = None
    correct_answer: str | None = None
    metadata: dict = field(default_factory=dict)


PADDLE_TO_STRUCTURED_MAP: dict[str, str] = {
    "text": "text",
    "question": "question",
    "table": "table",
    "image": "image",
    "diagram": "diagram",
    "formula": "formula",
    "chart": "chart",
    "heading": "heading",
    "list": "list",
    "figure": "diagram",
    "ocr_garbage": "garbage",
}


_GARBAGE_PATTERNS: list[re.Pattern] = [
    re.compile(r"^[^a-zA-Z]{2,}$"),
    re.compile(r"^[\d\s]+$"),
    re.compile(r"^[\W_]+$"),
    re.compile(r"(?:fcT&|vtf|tefa|#\s*<|ctf|xtf)"),
    re.compile(r"[^\w\s,.\-;:!?()\[\]{}\u2018\u2019\u201c\u201d]{5,}"),
    re.compile(r"^0\s*\?\)\s*c\s*"),
]


def _is_garbage(text: str) -> bool:
    if not text or not text.strip():
        return True
    stripped = text.strip()
    if len(stripped) < 3:
        return True
    if not re.search(r"[a-zA-Z0-9]", stripped):
        return True
    non_alnum = sum(not c.isalnum() and not c.isspace() for c in stripped)
    if non_alnum > len(stripped) * 0.5:
        return True
    for pat in _GARBAGE_PATTERNS:
        if pat.search(stripped):
            return True
    return False


class MarkdownGenerator:
    """
    Converts PaddleOCR parse blocks into structured markdown that preserves:
      - Question numbering (Q.1, 1., 1))
      - Options (a), (b), (c), (d)
      - Tables (| col1 | col2 |)
      - Formulas ($$ ... $$)
      - Diagrams placeholders
      - Section boundaries
      - Reading order
    """

    def generate(self, result, file_path: Path | None = None) -> str:
        blocks = self._paddle_blocks_to_structured(result)
        md = self._blocks_to_markdown(blocks)
        return md

    def _paddle_blocks_to_structured(self, result) -> list[StructuredBlock]:
        blocks: list[StructuredBlock] = []

        for b in result.blocks:
            ct = PADDLE_TO_STRUCTURED_MAP.get(b.content_type.value if hasattr(b.content_type, 'value') else str(b.content_type), "text")

            if ct == "garbage":
                continue

            text = (b.text or "").strip()
            if _is_garbage(text):
                continue

            sb = StructuredBlock(
                content_type=ct,
                text=text,
                page_number=b.page_number,
                bbox=b.bbox,
                confidence=b.confidence if hasattr(b, 'confidence') else 0.0,
                table_rows=b.table_rows if hasattr(b, 'table_rows') else None,
                table_columns=b.table_columns if hasattr(b, 'table_columns') else None,
                image_path=b.image_path if hasattr(b, 'image_path') else None,
                image_description=b.image_description if hasattr(b, 'image_description') else None,
                formula_latex=b.formula_latex if hasattr(b, 'formula_latex') else None,
                question_number=b.question_number if hasattr(b, 'question_number') else None,
                options=b.options if hasattr(b, 'options') else None,
                correct_answer=b.correct_answer if hasattr(b, 'correct_answer') else None,
            )
            blocks.append(sb)

        blocks = self._remove_garbage_blocks(blocks)
        return blocks

    def _remove_garbage_blocks(self, blocks: list[StructuredBlock]) -> list[StructuredBlock]:
        cleaned = []
        for b in blocks:
            if b.is_garbage:
                continue
            text = b.text.strip()
            if not text:
                continue
            if _is_garbage(text):
                continue
            cleaned.append(b)
        return cleaned

    def _blocks_to_markdown(self, blocks: list[StructuredBlock]) -> str:
        parts: list[str] = []
        current_page = 0
        previous_type = None

        for block in blocks:
            if block.page_number != current_page:
                current_page = block.page_number
                parts.append(f"\n--- Page {current_page} ---\n")

            pm = f"<!-- page:{block.page_number} -->\n"

            if block.content_type == "heading":
                if parts and not parts[-1].endswith("\n\n"):
                    parts.append("\n")
                parts.append(pm)
                parts.append(f"## {block.text}\n\n")
                previous_type = "heading"

            elif block.content_type == "question":
                if parts and not parts[-1].endswith("\n\n"):
                    parts.append("\n")
                parts.append(pm)
                parts.append(f"{block.text}\n")
                if block.options:
                    for opt in block.options:
                        parts.append(f"{opt}\n")
                if block.correct_answer:
                    parts.append(f"**Answer: {block.correct_answer}**\n")
                parts.append("\n")
                previous_type = "question"

            elif block.content_type == "table":
                if previous_type == "question":
                    parts.append("\n")
                parts.append("\n")
                parts.append(pm)
                if block.table_columns:
                    header = "| " + " | ".join(block.table_columns) + " |\n"
                    sep = "| " + " | ".join(["---"] * len(block.table_columns)) + " |\n"
                    parts.append(header)
                    parts.append(sep)
                for row in (block.table_rows or []):
                    parts.append("| " + " | ".join(row) + " |\n")
                parts.append("\n")
                previous_type = "table"

            elif block.content_type == "formula":
                latex = block.formula_latex or block.text
                parts.append(pm)
                parts.append(f"$$ {latex} $$\n\n")
                previous_type = "formula"

            elif block.content_type == "diagram":
                desc = block.image_description or block.text or "Diagram"
                img_path = block.image_path or ""
                parts.append(pm)
                if img_path:
                    parts.append(f"![{desc}]({img_path})\n\n")
                else:
                    parts.append(f"_[Diagram: {desc}]_\n\n")
                previous_type = "diagram"

            elif block.content_type == "chart":
                desc = block.image_description or block.text or "Chart"
                parts.append(pm)
                parts.append(f"_[Chart: {desc}]_\n\n")
                previous_type = "chart"

            elif block.content_type == "list":
                parts.append(pm)
                parts.append(f"{block.text}\n")
                previous_type = "list"

            elif block.content_type == "image":
                desc = block.image_description or block.text or "Image"
                img_path = block.image_path or ""
                parts.append(pm)
                if img_path:
                    parts.append(f"![{desc}]({img_path})\n\n")
                else:
                    parts.append(f"_[Image: {desc}]_\n\n")
                previous_type = "image"

            else:
                parts.append(pm)
                if block.text:
                    parts.append(f"{block.text}\n\n")
                previous_type = "text"

        return "".join(parts)


markdown_generator = MarkdownGenerator()
