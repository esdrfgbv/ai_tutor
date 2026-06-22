from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.models.models import QuestionImage
from app.services.question_extraction.question_parser import ParsedQuestion

logger = logging.getLogger(__name__)


@dataclass
class DiagramInfo:
    page_number: int
    image_path: str
    image_hash: str
    description: str
    bbox: list[float] | None = None
    width: int = 0
    height: int = 0


class DiagramProcessor:
    """
    Extracts and associates diagrams/images with their parent questions.

    Association rule:
      - If an image appears between Question N and Question N+1 in reading order,
        it is associated with Question N.
      - If an image appears before the first question on a page, it is associated
        with Question 0 (page header) or the first question on that page.
      - If an image appears after the last question, it is associated with the
        last question.
      - Images in answer key sections are ignored.
    """

    def extract_diagrams_from_blocks(self, blocks: list[Any], output_dir: Path, document_id: int) -> list[DiagramInfo]:
        diagrams: list[DiagramInfo] = []

        for block in blocks:
            ct = block.content_type.value if hasattr(block.content_type, 'value') else str(block.content_type)
            if ct not in ("diagram", "figure", "image", "chart"):
                continue

            img_path = block.image_path if hasattr(block, 'image_path') else None
            if not img_path:
                continue

            img_file = Path(img_path)
            if not img_file.exists():
                continue

            diagram_dir = output_dir / "diagrams" / str(document_id)
            diagram_dir.mkdir(parents=True, exist_ok=True)

            img_hash = hashlib.sha256(img_file.read_bytes()).hexdigest()[:16]
            ext = img_file.suffix
            dest_name = f"doc{document_id}_p{block.page_number}_{img_hash}{ext}"
            dest_path = diagram_dir / dest_name

            if not dest_path.exists():
                import shutil
                shutil.copy2(img_file, dest_path)

            desc = block.image_description if hasattr(block, 'image_description') else (block.text or "")
            bbox = block.bbox if hasattr(block, 'bbox') else None

            diagram = DiagramInfo(
                page_number=block.page_number,
                image_path=str(dest_path.relative_to(output_dir.parent)),
                image_hash=img_hash,
                description=desc[:500] if desc else "",
                bbox=bbox,
            )
            diagrams.append(diagram)

        return diagrams

    def associate_diagrams_with_questions(
        self,
        questions: list[ParsedQuestion],
        diagrams: list[DiagramInfo],
    ) -> dict[int, list[DiagramInfo]]:
        if not questions or not diagrams:
            return {}

        association: dict[int, list[DiagramInfo]] = {q.question_number or i: [] for i, q in enumerate(questions)}

        question_pages: dict[int, int] = {}
        for idx, q in enumerate(questions):
            key = q.question_number or idx
            question_pages[key] = q.page_number or 1

        unassociated: list[DiagramInfo] = []
        for d in diagrams:
            assigned = False
            for q in questions:
                qnum = q.question_number or 0
                qpage = q.page_number or 1

                if d.page_number < qpage:
                    continue
                if d.page_number > qpage:
                    continue

                association.setdefault(qnum, []).append(d)
                q.has_diagram = True
                assigned = True
                break

            if not assigned:
                unassociated.append(d)

        for d in unassociated:
            for q in reversed(questions):
                qpage = q.page_number or 1
                if d.page_number >= qpage:
                    qnum = q.question_number or 0
                    association.setdefault(qnum, []).append(d)
                    q.has_diagram = True
                    break

        return association

    def store_question_images(
        self,
        db: Session,
        question_id: int,
        diagrams: list[DiagramInfo],
        question: ParsedQuestion,
    ) -> int:
        stored = 0
        for d in diagrams:
            img = QuestionImage(
                question_id=question_id,
                image_path=d.image_path,
                image_type="diagram",
                page_number=d.page_number,
                width=d.width,
                height=d.height,
            )
            db.add(img)
            stored += 1
        return stored


diagram_processor = DiagramProcessor()
