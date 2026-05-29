"""
Image Extraction Service
=========================
Extracts embedded images and diagrams from PDF pages,
crops question-area figures, and saves them for association
with extracted questions.
"""

from __future__ import annotations

import logging
from pathlib import Path

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


class ImageExtractor:
    """Extracts and saves images from PDF pages."""

    def __init__(self, output_dir: Path | None = None):
        self.output_dir = output_dir or Path("uploads/question_images")

    def extract_images_from_pdf(
        self,
        pdf_path: Path,
        source_id: int,
    ) -> list[dict]:
        """
        Extract all embedded images from a PDF.

        Returns list of dicts with image metadata:
        [{"page": 1, "path": "/path/to/img.png", "width": 300, "height": 200}, ...]
        """
        results: list[dict] = []
        save_dir = self.output_dir / str(source_id)
        save_dir.mkdir(parents=True, exist_ok=True)

        try:
            doc = fitz.open(str(pdf_path))
        except Exception as e:
            logger.error("Cannot open PDF for image extraction: %s", e)
            return results

        for page_idx, page in enumerate(doc, start=1):
            image_list = page.get_images(full=True)

            for img_idx, img_info in enumerate(image_list):
                xref = img_info[0]
                try:
                    base_image = doc.extract_image(xref)
                    if not base_image:
                        continue

                    image_bytes = base_image["image"]
                    image_ext = base_image.get("ext", "png")
                    width = base_image.get("width", 0)
                    height = base_image.get("height", 0)

                    # Skip tiny images (likely icons/bullets)
                    if width < 30 or height < 30:
                        continue

                    filename = f"page{page_idx}_img{img_idx}.{image_ext}"
                    filepath = save_dir / filename

                    with open(filepath, "wb") as f:
                        f.write(image_bytes)

                    results.append({
                        "page": page_idx,
                        "path": str(filepath),
                        "width": width,
                        "height": height,
                        "filename": filename,
                    })

                except Exception as e:
                    logger.warning(
                        "Failed to extract image xref=%d page=%d: %s",
                        xref, page_idx, e,
                    )

        doc.close()
        logger.info(
            "Extracted %d images from %s (source_id=%d)",
            len(results), pdf_path.name, source_id,
        )
        return results

    def associate_images_to_questions(
        self,
        images: list[dict],
        questions: list[dict],
    ) -> dict[int, list[dict]]:
        """
        Associate extracted images to questions based on page proximity.

        Returns {question_number: [image_info, ...]}.
        """
        associations: dict[int, list[dict]] = {}

        for img in images:
            img_page = img["page"]
            # Find questions on the same page
            page_questions = [
                q for q in questions
                if q.get("page_number") == img_page
            ]
            if page_questions:
                # Associate with the first question on the page
                # (heuristic — can be improved with bounding box analysis)
                qnum = page_questions[0].get("number", 0)
                if qnum not in associations:
                    associations[qnum] = []
                associations[qnum].append(img)

        return associations


# Module-level singleton
image_extractor = ImageExtractor()
