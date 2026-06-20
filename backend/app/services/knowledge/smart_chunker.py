"""
Smart Chunker
===============
Layout-aware, semantic chunking that respects document structure.
Replaces the simple word-count sliding window in ingestion/chunking.py.

Key improvements:
  - Respects heading/paragraph/section boundaries
  - Doesn't split mid-sentence or mid-question
  - Tables are kept as single chunks
  - Question blocks (question + options + answer) are kept together
  - Supports hierarchical parent-child chunks
"""

from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass, field

from app.services.knowledge.layout_parser import ElementType, LayoutElement

logger = logging.getLogger(__name__)


@dataclass
class Chunk:
    """A chunk of content ready for embedding."""
    text: str
    chunk_type: str  # text, table, image_context, question_block, heading
    page_number: int | None = None
    chunk_hash: str = ""
    parent_index: int | None = None  # Index of parent chunk (for hierarchy)
    structured_data: dict | None = None
    metadata: dict = field(default_factory=dict)

    def compute_hash(self) -> str:
        self.chunk_hash = hashlib.sha256(self.text.encode("utf-8")).hexdigest()
        return self.chunk_hash


class SmartChunker:
    """
    Layout-aware chunker that respects document structure.
    Produces chunks suitable for embedding and retrieval.
    """

    def __init__(
        self,
        target_size: int = 500,    # Target words per chunk
        max_size: int = 800,       # Maximum words per chunk
        overlap: int = 50,         # Word overlap between text chunks
    ):
        self.target_size = target_size
        self.max_size = max_size
        self.overlap = overlap

    def chunk_elements(self, elements: list[LayoutElement]) -> list[Chunk]:
        """
        Chunk a list of layout elements into retrieval-ready chunks.
        Respects structural boundaries.
        """
        chunks: list[Chunk] = []
        current_heading_idx: int | None = None
        buffer_text: list[str] = []
        buffer_page: int | None = None

        for element in elements:
            if element.element_type == ElementType.heading:
                # Flush current buffer before heading
                if buffer_text:
                    chunks.extend(self._split_text(
                        "\n".join(buffer_text),
                        page_number=buffer_page,
                        parent_index=current_heading_idx,
                    ))
                    buffer_text = []

                # Add heading as its own chunk
                heading_chunk = Chunk(
                    text=element.text,
                    chunk_type="heading",
                    page_number=element.page_number,
                )
                heading_chunk.compute_hash()
                chunks.append(heading_chunk)
                current_heading_idx = len(chunks) - 1
                buffer_page = element.page_number

            elif element.element_type == ElementType.question_block:
                # Flush buffer
                if buffer_text:
                    chunks.extend(self._split_text(
                        "\n".join(buffer_text),
                        page_number=buffer_page,
                        parent_index=current_heading_idx,
                    ))
                    buffer_text = []

                # Question blocks are kept as single chunks
                q_chunk = Chunk(
                    text=element.text,
                    chunk_type="question_block",
                    page_number=element.page_number,
                    parent_index=current_heading_idx,
                )
                q_chunk.compute_hash()
                chunks.append(q_chunk)

            elif element.element_type == ElementType.answer_key:
                # Flush buffer
                if buffer_text:
                    chunks.extend(self._split_text(
                        "\n".join(buffer_text),
                        page_number=buffer_page,
                        parent_index=current_heading_idx,
                    ))
                    buffer_text = []

                # Answer keys are kept together
                ak_chunk = Chunk(
                    text=element.text,
                    chunk_type="text",
                    page_number=element.page_number,
                    parent_index=current_heading_idx,
                    metadata={"is_answer_key": True},
                )
                ak_chunk.compute_hash()
                chunks.append(ak_chunk)

            elif element.element_type == ElementType.table:
                # Flush buffer
                if buffer_text:
                    chunks.extend(self._split_text(
                        "\n".join(buffer_text),
                        page_number=buffer_page,
                        parent_index=current_heading_idx,
                    ))
                    buffer_text = []

                # Tables are single chunks
                t_chunk = Chunk(
                    text=element.text,
                    chunk_type="table",
                    page_number=element.page_number,
                    parent_index=current_heading_idx,
                )
                t_chunk.compute_hash()
                chunks.append(t_chunk)

            elif element.element_type == ElementType.image:
                # Images become image_context chunks (text will be added later by image processor)
                if element.text and element.text != "[IMAGE]":
                    i_chunk = Chunk(
                        text=element.text,
                        chunk_type="image_context",
                        page_number=element.page_number,
                        parent_index=current_heading_idx,
                    )
                    i_chunk.compute_hash()
                    chunks.append(i_chunk)

            else:
                # Paragraph, list_item, etc. — add to buffer
                buffer_text.append(element.text)
                if buffer_page is None:
                    buffer_page = element.page_number

                # Check if buffer is getting large
                word_count = sum(len(t.split()) for t in buffer_text)
                if word_count >= self.target_size:
                    chunks.extend(self._split_text(
                        "\n".join(buffer_text),
                        page_number=buffer_page,
                        parent_index=current_heading_idx,
                    ))
                    buffer_text = []
                    buffer_page = element.page_number

        # Flush remaining buffer
        if buffer_text:
            chunks.extend(self._split_text(
                "\n".join(buffer_text),
                page_number=buffer_page,
                parent_index=current_heading_idx,
            ))

        return chunks

    def chunk_plain_text(self, text: str, page_number: int | None = None) -> list[Chunk]:
        """
        Simple chunking for plain text without layout info.
        Still respects sentence boundaries.
        """
        return self._split_text(text, page_number=page_number)

    def _split_text(
        self,
        text: str,
        *,
        page_number: int | None = None,
        parent_index: int | None = None,
    ) -> list[Chunk]:
        """
        Split text into chunks respecting sentence boundaries.
        Uses target_size and overlap.
        """
        text = self._clean_text(text)
        if not text:
            return []

        words = text.split()
        if len(words) <= self.max_size:
            chunk = Chunk(
                text=text,
                chunk_type="text",
                page_number=page_number,
                parent_index=parent_index,
            )
            chunk.compute_hash()
            return [chunk]

        # Split at sentence boundaries
        sentences = self._split_sentences(text)
        chunks: list[Chunk] = []
        current_words: list[str] = []

        for sentence in sentences:
            sentence_words = sentence.split()
            projected = len(current_words) + len(sentence_words)

            if projected > self.max_size and current_words:
                # Emit current chunk
                chunk_text = " ".join(current_words)
                chunk = Chunk(
                    text=chunk_text,
                    chunk_type="text",
                    page_number=page_number,
                    parent_index=parent_index,
                )
                chunk.compute_hash()
                chunks.append(chunk)

                # Keep overlap
                if self.overlap > 0 and len(current_words) > self.overlap:
                    current_words = current_words[-self.overlap:]
                else:
                    current_words = []

            current_words.extend(sentence_words)

        # Emit remaining
        if current_words:
            chunk_text = " ".join(current_words)
            chunk = Chunk(
                text=chunk_text,
                chunk_type="text",
                page_number=page_number,
                parent_index=parent_index,
            )
            chunk.compute_hash()
            chunks.append(chunk)

        return chunks

    def _split_sentences(self, text: str) -> list[str]:
        """Split text into sentences."""
        # Split on sentence-ending punctuation followed by space or newline
        parts = re.split(r"(?<=[.!?])\s+", text)
        return [p.strip() for p in parts if p.strip()]

    def _clean_text(self, text: str) -> str:
        """Clean extracted text."""
        # Collapse excessive whitespace
        text = re.sub(r"\s+", " ", text)
        # Remove common PDF artifacts
        text = re.sub(r"Downloaded from.*?(?=\.|$)", "", text, flags=re.IGNORECASE)
        return text.strip()


smart_chunker = SmartChunker()
