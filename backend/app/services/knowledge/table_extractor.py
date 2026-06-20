"""
Table Extractor
================
Detects and extracts tables from PDF documents using pdfplumber.
Outputs structured JSON for each table and generates natural language
descriptions for vector search embedding.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class ExtractedTable:
    """A structured table extracted from a document."""
    page_number: int
    table_index: int
    table_title: str
    headers: list[str]
    rows: list[list[str]]
    raw_text: str  # Natural language representation for embedding

    def to_json(self) -> dict:
        return {
            "table_title": self.table_title,
            "headers": self.headers,
            "rows": self.rows,
        }

    def to_searchable_text(self) -> str:
        """Convert table to natural language text for vector search."""
        parts = []
        if self.table_title:
            parts.append(f"Table: {self.table_title}")
        if self.headers:
            parts.append(f"Columns: {', '.join(self.headers)}")
        for row in self.rows[:20]:  # Cap at 20 rows for embedding
            row_text = " | ".join(str(cell) for cell in row if cell)
            if row_text:
                parts.append(row_text)
        return "\n".join(parts)


class TableExtractor:
    """Extracts tables from PDF files using pdfplumber."""

    def extract_tables(self, file_path: Path) -> list[ExtractedTable]:
        """
        Extract all tables from a PDF.
        Returns list of ExtractedTable objects.
        """
        try:
            import pdfplumber
        except ImportError:
            logger.warning("pdfplumber not installed. Table extraction disabled.")
            return []

        tables: list[ExtractedTable] = []

        try:
            pdf = pdfplumber.open(str(file_path))
        except Exception as e:
            logger.error("Cannot open PDF for table extraction: %s", e)
            return tables

        for page_idx, page in enumerate(pdf.pages, start=1):
            try:
                page_tables = page.extract_tables()
                if not page_tables:
                    continue

                for tbl_idx, raw_table in enumerate(page_tables):
                    if not raw_table or len(raw_table) < 2:
                        continue  # Skip single-row "tables"

                    # Clean cells
                    cleaned = []
                    for row in raw_table:
                        cleaned_row = [
                            (cell.strip() if cell else "") for cell in row
                        ]
                        cleaned.append(cleaned_row)

                    # First row as headers if it looks like a header
                    headers = cleaned[0] if cleaned else []
                    data_rows = cleaned[1:] if len(cleaned) > 1 else []

                    # Skip if all cells are empty
                    all_cells = [
                        cell for row in cleaned for cell in row if cell
                    ]
                    if not all_cells:
                        continue

                    # Try to detect table title from text above table
                    title = self._detect_table_title(page, raw_table)

                    # Build raw text representation
                    raw_text = self._table_to_text(title, headers, data_rows)

                    tables.append(ExtractedTable(
                        page_number=page_idx,
                        table_index=tbl_idx,
                        table_title=title,
                        headers=headers,
                        rows=data_rows,
                        raw_text=raw_text,
                    ))

            except Exception as e:
                logger.warning(
                    "Table extraction error on page %d: %s", page_idx, e
                )

        pdf.close()
        logger.info("Extracted %d tables from %s", len(tables), file_path.name)
        return tables

    def _detect_table_title(self, page, table_data) -> str:
        """Attempt to detect a table title from text just above the table area."""
        # Simple heuristic: look for short bold text near top of page
        # This is a best-effort approach
        try:
            text = page.extract_text() or ""
            lines = text.split("\n")
            for line in lines[:5]:
                stripped = line.strip()
                if stripped and len(stripped) < 100 and "table" in stripped.lower():
                    return stripped
        except Exception:
            pass
        return ""

    def _table_to_text(
        self, title: str, headers: list[str], rows: list[list[str]]
    ) -> str:
        """Convert a table to a natural language text representation."""
        parts = []
        if title:
            parts.append(f"Table: {title}")
        if headers:
            parts.append("Headers: " + " | ".join(h for h in headers if h))
        for i, row in enumerate(rows[:30]):
            row_str = " | ".join(str(cell) for cell in row if cell)
            if row_str:
                parts.append(f"Row {i + 1}: {row_str}")
        return "\n".join(parts)


table_extractor = TableExtractor()
