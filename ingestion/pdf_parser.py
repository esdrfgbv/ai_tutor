from pathlib import Path

import fitz


def extract_pages(pdf_path: Path) -> list[dict]:
    document = fitz.open(pdf_path)
    pages: list[dict] = []
    for index, page in enumerate(document, start=1):
        text = page.get_text("text")
        if text.strip():
            pages.append({"page_number": index, "text": text})
    return pages
