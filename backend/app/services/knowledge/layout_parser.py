"""
Layout Parser
===============
Parses document structure using PyMuPDF's dict output to identify
headings, paragraphs, tables, lists, and image regions.
Preserves document hierarchy for semantic chunking.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from enum import Enum

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


class ElementType(str, Enum):
    heading = "heading"
    paragraph = "paragraph"
    list_item = "list_item"
    table = "table"
    image = "image"
    equation = "equation"
    question_block = "question_block"
    answer_key = "answer_key"


@dataclass
class LayoutElement:
    """A structural element detected in the document."""
    element_type: ElementType
    text: str
    page_number: int
    bbox: tuple[float, float, float, float] | None = None  # (x0, y0, x1, y1)
    font_size: float = 0.0
    is_bold: bool = False
    level: int = 0  # heading level (1-6), or list nesting
    children: list["LayoutElement"] = field(default_factory=list)


@dataclass
class DocumentLayout:
    """Full parsed layout of a document."""
    elements: list[LayoutElement]
    page_count: int
    has_tables: bool = False
    has_images: bool = False
    has_questions: bool = False


# Question detection patterns
QUESTION_RE = re.compile(
    r"(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*)?\d{1,3}\s*[.):\s]",
    re.MULTILINE,
)
ANSWER_SECTION_RE = re.compile(
    r"(?:answer\s*key|answers|solution|answer\s*sheet|correct\s*answers)",
    re.IGNORECASE,
)


class LayoutParser:
    """Parses document structure from PDF pages."""

    def parse_pdf(self, file_path: str, pages_text: list[dict] | None = None) -> DocumentLayout:
        """
        Parse layout from a PDF file.
        pages_text: optional pre-extracted page texts [{page_number, text}, ...]
        """
        elements: list[LayoutElement] = []
        has_tables = False
        has_images = False
        has_questions = False

        try:
            doc = fitz.open(file_path)
        except Exception as e:
            logger.error("Cannot open PDF for layout parsing: %s", e)
            return DocumentLayout(elements=[], page_count=0)

        for page_idx, page in enumerate(doc, start=1):
            page_elements = self._parse_page(page, page_idx)
            elements.extend(page_elements)

            for el in page_elements:
                if el.element_type == ElementType.table:
                    has_tables = True
                elif el.element_type == ElementType.image:
                    has_images = True
                elif el.element_type == ElementType.question_block:
                    has_questions = True

        page_count = doc.page_count
        doc.close()

        return DocumentLayout(
            elements=elements,
            page_count=page_count,
            has_tables=has_tables,
            has_images=has_images,
            has_questions=has_questions,
        )

    def parse_text_pages(self, pages: list[dict]) -> DocumentLayout:
        """
        Parse layout from pre-extracted page text dicts.
        Each dict has: {"page_number": int, "text": str}
        """
        elements: list[LayoutElement] = []
        has_questions = False

        for page_data in pages:
            page_num = page_data["page_number"]
            text = page_data["text"]
            page_elements = self._parse_text_layout(text, page_num)
            elements.extend(page_elements)

            for el in page_elements:
                if el.element_type == ElementType.question_block:
                    has_questions = True

        return DocumentLayout(
            elements=elements,
            page_count=len(pages),
            has_questions=has_questions,
        )

    def _parse_page(self, page, page_number: int) -> list[LayoutElement]:
        """Parse a single PDF page using PyMuPDF's dict output."""
        elements: list[LayoutElement] = []

        try:
            blocks = page.get_text("dict", flags=fitz.TEXTFLAGS_TEXT)["blocks"]
        except Exception:
            # Fallback to simple text
            text = page.get_text("text")
            if text and text.strip():
                elements.extend(self._parse_text_layout(text, page_number))
            return elements

        for block in blocks:
            if block.get("type") == 1:
                # Image block
                elements.append(LayoutElement(
                    element_type=ElementType.image,
                    text="[IMAGE]",
                    page_number=page_number,
                    bbox=tuple(block.get("bbox", (0, 0, 0, 0))),
                ))
                continue

            if block.get("type") != 0:
                continue

            # Text block — analyze spans for structure
            block_text_parts: list[str] = []
            max_font_size = 0.0
            any_bold = False

            for line in block.get("lines", []):
                line_text_parts: list[str] = []
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    if not text:
                        continue
                    line_text_parts.append(text)
                    font_size = span.get("size", 0)
                    if font_size > max_font_size:
                        max_font_size = font_size
                    flags = span.get("flags", 0)
                    if flags & 2 ** 4:  # bold flag
                        any_bold = True

                if line_text_parts:
                    block_text_parts.append(" ".join(line_text_parts))

            block_text = "\n".join(block_text_parts).strip()
            if not block_text:
                continue

            # Classify element type
            element_type = self._classify_text_block(
                block_text, max_font_size, any_bold
            )

            elements.append(LayoutElement(
                element_type=element_type,
                text=block_text,
                page_number=page_number,
                bbox=tuple(block.get("bbox", (0, 0, 0, 0))),
                font_size=max_font_size,
                is_bold=any_bold,
            ))

        return elements

    def _parse_text_layout(self, text: str, page_number: int) -> list[LayoutElement]:
        """Parse structure from plain text (fallback when dict mode not available)."""
        elements: list[LayoutElement] = []

        # Check for answer section
        if ANSWER_SECTION_RE.search(text[:200]):
            elements.append(LayoutElement(
                element_type=ElementType.answer_key,
                text=text,
                page_number=page_number,
            ))
            return elements

        # Split by paragraph breaks
        paragraphs = re.split(r"\n\s*\n", text)

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            element_type = self._classify_text_block(para, 0, False)
            elements.append(LayoutElement(
                element_type=element_type,
                text=para,
                page_number=page_number,
            ))

        return elements

    def _classify_text_block(
        self, text: str, font_size: float, is_bold: bool
    ) -> ElementType:
        """Classify a text block into an element type."""
        stripped = text.strip()

        # Check for question pattern
        if QUESTION_RE.match(stripped):
            return ElementType.question_block

        # Check for answer key
        if ANSWER_SECTION_RE.search(stripped[:100]):
            return ElementType.answer_key

        # Check for list items
        if re.match(r"^\s*[-•●▪]\s+", stripped) or re.match(r"^\s*\d+\.\s+", stripped):
            return ElementType.list_item

        # Heading detection: larger font or bold + short text
        if font_size > 14 and len(stripped) < 200:
            return ElementType.heading
        if is_bold and len(stripped) < 100 and "\n" not in stripped:
            return ElementType.heading

        # All-caps short text is likely a heading
        if stripped.isupper() and len(stripped) < 100:
            return ElementType.heading

        return ElementType.paragraph


layout_parser = LayoutParser()
