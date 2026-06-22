from __future__ import annotations

import hashlib
import json
import logging
import re
import time
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.enums import (
    Difficulty,
    ExtractionStatus,
    QuestionSourceType,
    QuestionType,
)
from app.models.models import (
    QuestionImage,
    QuestionBank,
    QuestionBankSource,
    QuestionExplanation,
    QuestionOption,
    QuestionTag,
)
from app.services.question_extraction.markdown_generator import StructuredBlock, markdown_generator
from app.services.question_extraction.question_parser import ParsedQuestion, question_parser
from app.services.question_extraction.question_validator import question_validator
from app.services.question_extraction.diagram_processor import DiagramInfo, diagram_processor

logger = logging.getLogger(__name__)

_PDF_EXTENSIONS = {".pdf"}
_SUPPORTED_EXTENSIONS = _PDF_EXTENSIONS | {".png", ".jpg", ".jpeg", ".tiff", ".bmp"}

_DETECTED_SECTION_NAMES = [
    "Mental Ability", "Arithmetic Test", "Mathematics", "Language Test",
    "English", "Science", "General Knowledge", "Reasoning",
    "Hindi", "Social Studies", "General Science",
]

_SECTION_TO_SUBJECT = {
    "Mental Ability": "Mental Ability",
    "Arithmetic Test": "Mathematics",
    "Mathematics": "Mathematics",
    "Language Test": "English",
    "English": "English",
    "Science": "Science",
    "General Knowledge": "General Knowledge",
    "Reasoning": "Mental Ability",
    "Hindi": "Hindi",
    "Social Studies": "Social Studies",
    "General Science": "Science",
}

_AUDIT_ACTIONS = {
    "uploaded": "Document Uploaded",
    "page_extraction": "Pages Processed",
    "markdown_generated": "Markdown Generated",
    "questions_extracted": "Questions Extracted",
    "questions_validated": "Questions Validated",
    "questions_rejected": "Questions Rejected",
    "tables_extracted": "Tables Extracted",
    "diagrams_extracted": "Diagrams Extracted",
    "insert_success": "Insert Success",
    "insert_failure": "Insert Failure",
    "duplicate_skipped": "Duplicate Skipped",
    "ocr_duration": "OCR Duration",
    "validation_failure": "Validation Failure",
}


class QuestionExtractionPipeline:
    """
    Enterprise-grade question extraction pipeline.

    Flow:
      1. Classify document (text PDF vs scanned, detect features)
      2. Parse with PaddleOCR (full document parsing)
      3. Generate structured markdown (preserving all structure)
      4. Extract questions from markdown (question detection + option parsing)
      5. Extract and associate diagrams with questions
      6. Validate each question (reject corrupted/garbage)
      7. Normalize and store in question bank database
      8. Audit logging at every stage
      9. Duplicate detection via hash
    """

    def __init__(self):
        self.settings = get_settings()
        self._paddle_available = False
        self._check_paddle()

    def _check_paddle(self) -> None:
        try:
            from app.services.knowledge.paddle_ocr_engine import paddle_ocr_engine
            self._paddle_available = paddle_ocr_engine.available
            self._paddle_engine = paddle_ocr_engine
        except ImportError:
            self._paddle_available = False
            logger.warning("PaddleOCR engine not available")

    @property
    def available(self) -> bool:
        return self._paddle_available

    def process_pdf(
        self,
        pdf_path: Path,
        db: Session,
        *,
        exam_type: str | None = None,
        year: int | None = None,
        grade: int | None = None,
        display_name: str | None = None,
    ) -> dict:
        pdf_path = Path(pdf_path).resolve()
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        file_name = pdf_path.name
        if display_name is None:
            display_name = self._generate_display_name(file_name)

        if year is None:
            year = self._detect_year(file_name)
        if exam_type is None:
            exam_type = self._detect_exam_type(file_name)
        if grade is None:
            grade = self._detect_grade(file_name)

        source = self._get_or_create_source(db, pdf_path, file_name, display_name, exam_type, year, grade)
        source.extraction_status = ExtractionStatus.processing
        db.flush()

        self._audit(db, source.id, "uploaded", f"Document Uploaded: {file_name}")

        try:
            # Phase 1: Document classification
            doc_classification = self._classify_document(pdf_path)
            source.classification_metadata = doc_classification
            self._audit(db, source.id, "classified", f"Document classified: {doc_classification.get('type', 'unknown')}")

            # Phase 2: PaddleOCR parsing
            ocr_started = time.perf_counter()
            parse_result = self._parse_with_paddle(pdf_path)
            ocr_duration = round(time.perf_counter() - ocr_started, 3)
            if not parse_result or not parse_result.blocks:
                errors = getattr(parse_result, "errors", []) if parse_result else []
                raise RuntimeError(f"PaddleOCR returned no content blocks: {'; '.join(errors) or 'unknown error'}")

            source.total_pages = parse_result.total_pages
            source.ocr_report = {
                "engine": "PaddleOCR",
                "pages_processed": parse_result.total_pages,
                "blocks_returned": len(parse_result.blocks),
                "ocr_duration_seconds": ocr_duration,
                "errors": getattr(parse_result, "errors", []),
            }
            self._audit(db, source.id, "page_extraction", f"Pages processed: {parse_result.total_pages}")
            self._audit(db, source.id, "ocr_duration", f"OCR duration: {ocr_duration}s")

            # Save OCR debug artifact
            self._save_debug_artifact(source.id, "raw_parse_result.json", {
                "total_pages": parse_result.total_pages,
                "blocks_count": len(parse_result.blocks),
                "blocks": [
                    {
                        "index": i,
                        "content_type": str(b.content_type.value if hasattr(b.content_type, 'value') else b.content_type),
                        "page_number": b.page_number,
                        "text": b.text[:500],
                        "confidence": getattr(b, 'confidence', 0),
                        "bbox": getattr(b, 'bbox', None),
                        "question_number": getattr(b, 'question_number', None),
                        "options": getattr(b, 'options', None),
                    }
                    for i, b in enumerate(parse_result.blocks)
                ],
                "errors": parse_result.errors,
                "ocr_duration_seconds": ocr_duration,
            })

            # Phase 3: Generate structured markdown
            markdown = markdown_generator.generate(parse_result, pdf_path)
            markdown_path = self._store_markdown(source.id, pdf_path, markdown)
            source.generated_markdown_path = str(markdown_path)
            self._audit(db, source.id, "markdown_generated", f"Markdown generated ({len(markdown)} chars)")
            self._save_debug_artifact(source.id, "generated_markdown.md", markdown)

            # Phase 4: Extract diagrams from blocks
            output_dir = Path(self.settings.upload_dir) / "pdf_sources"
            diagrams = diagram_processor.extract_diagrams_from_blocks(
                parse_result.blocks, output_dir, source.id,
            )
            self._audit(db, source.id, "diagrams_extracted", f"Diagrams extracted: {len(diagrams)}")

            # Phase 5: Parse questions from markdown
            page_info = self._build_page_info(parse_result)
            parsed_questions = question_parser.parse_markdown(markdown, page_info)
            self._audit(db, source.id, "questions_extracted", f"Questions found: {len(parsed_questions)}")
            self._save_debug_artifact(source.id, "parsed_questions.json", {
                "questions_count": len(parsed_questions),
                "questions": [
                    {
                        "question_number": q.question_number,
                        "question_text": q.question_text[:200],
                        "option_a": q.option_a[:100],
                        "option_b": q.option_b[:100],
                        "option_c": q.option_c[:100],
                        "option_d": q.option_d[:100],
                        "correct_answer": q.correct_answer,
                        "section": q.section,
                        "page_number": q.page_number,
                        "has_diagram": q.has_diagram,
                        "has_table": q.has_table,
                        "has_formula": q.has_formula,
                    }
                    for q in parsed_questions
                ],
            })

            # Phase 6: Associate diagrams with questions
            diagram_association = diagram_processor.associate_diagrams_with_questions(parsed_questions, diagrams)

            # Phase 7: Classify sections
            section_info = self._detect_sections(markdown, parsed_questions)
            for idx, q in enumerate(parsed_questions):
                if not q.section:
                    q.section = section_info.get("default_section")

            # Phase 8: Validate questions
            valid_questions: list[ParsedQuestion] = []
            rejected_questions: list[dict] = []

            for q in parsed_questions:
                validation = question_validator.validate(q)
                if validation.is_valid:
                    valid_questions.append(q)
                else:
                    rejected_questions.append({
                        "question_number": q.question_number,
                        "errors": validation.errors,
                        "warnings": validation.warnings,
                        "text_preview": q.question_text[:100],
                    })

            self._audit(
                db, source.id, "questions_validated",
                f"Valid: {len(valid_questions)}, Rejected: {len(rejected_questions)}",
            )
            self._save_debug_artifact(source.id, "validation_report.json", {
                "total_parsed": len(parsed_questions),
                "valid_count": len(valid_questions),
                "rejected_count": len(rejected_questions),
                "rejected": rejected_questions[:100],
                "valid_question_numbers": [q.question_number for q in valid_questions],
            })
            if rejected_questions:
                self._audit(db, source.id, "validation_failure", f"Validation failures: {len(rejected_questions)}")
                logger.warning("Rejected %d questions: %s", len(rejected_questions), rejected_questions)

            # Phase 9: Deduplicate by hash
            unique_questions, duplicate_count = self._deduplicate_questions(valid_questions)
            if len(unique_questions) < len(valid_questions):
                self._audit(db, source.id, "duplicate_skipped",
                            f"Duplicates removed: {duplicate_count}")

            # Phase 10: Store in database
            database_report = self._store_questions(
                db, source, unique_questions, diagram_association,
                year=year, grade=grade or 6,
            )
            stored_count = database_report["inserted_rows"]

            source.total_questions_extracted = stored_count
            source.extraction_status = ExtractionStatus.completed
            source.processed_at = datetime.utcnow()
            source.extraction_report = {
                "questions_extracted": len(parsed_questions),
                "questions_valid": len(valid_questions),
                "questions_rejected": len(rejected_questions),
                "duplicate_questions": duplicate_count,
                "tables_found": sum(1 for q in parsed_questions if q.has_table),
                "images_found": len(diagrams) + sum(len(q.metadata.get("images", [])) for q in parsed_questions),
                "formulas_found": sum(1 for q in parsed_questions if q.has_formula),
                "validation_failures": rejected_questions[:100],
            }
            source.database_report = database_report
            self._save_debug_artifact(source.id, "database_insert_report.json", database_report)
            db.commit()

            self._audit(db, source.id, "insert_success", f"Questions stored: {stored_count}")

            logger.info(
                "Pipeline extracted %d valid questions from %s (%d pages, %d rejected)",
                stored_count, file_name, parse_result.total_pages, len(rejected_questions),
            )

            return {
                "source_id": source.id,
                "file_name": file_name,
                "total_pages": parse_result.total_pages,
                "total_questions": stored_count,
                "questions_found": len(parsed_questions),
                "questions_rejected": len(rejected_questions),
                "duplicate_questions": duplicate_count,
                "diagrams_found": len(diagrams),
                "tables_found": source.extraction_report["tables_found"],
                "formulas_found": source.extraction_report["formulas_found"],
                "ocr_report": source.ocr_report,
                "extraction_report": source.extraction_report,
                "database_report": database_report,
                "sections_found": section_info.get("sections", []),
                "rejected_details": rejected_questions[:20],
                "status": "completed",
            }

        except Exception as exc:
            source.extraction_status = ExtractionStatus.failed
            source.extraction_error = str(exc)[:2000]
            db.commit()
            self._audit(db, source.id, "insert_failure", f"Pipeline failed: {str(exc)[:200]}")
            logger.error("Pipeline failed for %s: %s", file_name, exc, exc_info=True)
            return {
                "source_id": source.id,
                "file_name": file_name,
                "status": "failed",
                "error": str(exc),
            }

    def _classify_document(self, pdf_path: Path) -> dict:
        import fitz

        classification = {
            "type": "unknown",
            "is_text_pdf": False,
            "is_scanned_pdf": False,
            "contains_images": False,
            "contains_tables": False,
            "contains_formulas": False,
            "contains_mcqs": False,
            "contains_multiple_sections": False,
            "total_pages": 0,
        }

        try:
            doc = fitz.open(str(pdf_path))
            classification["total_pages"] = doc.page_count

            text_count = 0
            image_count = 0
            total_text_len = 0
            all_text_parts: list[str] = []

            for page in doc:
                text = page.get_text("text")
                if text and text.strip():
                    text_count += 1
                    total_text_len += len(text.strip())
                    all_text_parts.append(text)
                images = page.get_images()
                image_count += len(images)

            doc.close()

            classification["is_text_pdf"] = (text_count / max(classification["total_pages"], 1)) > 0.5
            classification["is_scanned_pdf"] = not classification["is_text_pdf"]
            classification["contains_images"] = image_count > 0
            classification["contains_diagrams"] = image_count > 0
            classification["contains_mcqs"] = True
            all_text = "\n".join(all_text_parts)
            classification["contains_tables"] = bool(re.search(r"\btable\b|\|", all_text, re.IGNORECASE))
            classification["contains_formulas"] = bool(re.search(r"[=+\-*/^]|\\frac|\$", all_text))
            classification["contains_multiple_sections"] = classification["total_pages"] > 2

        except Exception as e:
            logger.warning("Document classification failed: %s", e)

        return classification

    def _parse_with_paddle(self, pdf_path: Path):
        if not self._paddle_available:
            raise RuntimeError(
                "PaddleOCR engine is not available. "
                "Cannot process document. "
                "Ensure PaddleOCR and PaddlePaddle are installed."
            )
        logger.info("Parsing document with PaddleOCR: %s", pdf_path.name)
        return self._paddle_engine.parse_document(pdf_path)

    def _build_page_info(self, parse_result) -> list[tuple[int, int, int]] | None:
        try:
            pages = []
            for i, block in enumerate(parse_result.blocks):
                pn = block.page_number
                pages.append((pn, i, i))
            return [(pn, min(i for pn2, i, _ in pages if pn2 == pn),
                     max(i for pn2, _, i in pages if pn2 == pn))
                    for pn in sorted(set(p[0] for p in pages))]
        except Exception:
            return None

    def _detect_sections(self, markdown: str, questions: list[ParsedQuestion]) -> dict:
        sections_found: set[str] = set()

        for sname in _DETECTED_SECTION_NAMES:
            if re.search(re.escape(sname), markdown, re.IGNORECASE):
                sections_found.add(sname)

        for q in questions:
            if q.section:
                sections_found.add(q.section)

        subject_counts: dict[str, int] = {}
        for q in questions:
            subj = _SECTION_TO_SUBJECT.get(q.section or "", q.section or "")
            if subj:
                subject_counts[subj] = subject_counts.get(subj, 0) + 1

        default_section = max(subject_counts, key=subject_counts.get) if subject_counts else None

        return {
            "sections": list(sections_found),
            "default_section": default_section,
            "subject_counts": subject_counts,
        }

    def _deduplicate_questions(self, questions: list[ParsedQuestion]) -> tuple[list[ParsedQuestion], int]:
        seen: set[str] = set()
        unique: list[ParsedQuestion] = []
        duplicate_count = 0

        for q in questions:
            qhash = self._question_hash(q)
            q.metadata["question_hash"] = qhash
            if qhash not in seen:
                seen.add(qhash)
                unique.append(q)
            else:
                duplicate_count += 1

        return unique, duplicate_count

    def _question_hash(self, q: ParsedQuestion) -> str:
        combined = "|".join([
            self._normalize_for_hash(q.question_text),
            self._normalize_for_hash(q.option_a),
            self._normalize_for_hash(q.option_b),
            self._normalize_for_hash(q.option_c),
            self._normalize_for_hash(q.option_d),
        ])
        return hashlib.sha256(combined.encode("utf-8")).hexdigest()

    def _normalize_for_hash(self, value: str | None) -> str:
        return re.sub(r"\s+", " ", (value or "").strip().lower())

    def _store_markdown(self, source_id: int, pdf_path: Path, markdown: str) -> Path:
        output_dir = Path(self.settings.upload_dir) / "pdf_sources" / "markdown"
        output_dir.mkdir(parents=True, exist_ok=True)
        safe_stem = re.sub(r"[^A-Za-z0-9_.-]+", "_", pdf_path.stem)
        output_path = output_dir / f"{source_id}_{safe_stem}.md"
        output_path.write_text(markdown, encoding="utf-8")
        return output_path

    def _store_questions(
        self,
        db: Session,
        source: QuestionBankSource,
        questions: list[ParsedQuestion],
        diagram_association: dict[int, list[DiagramInfo]],
        *,
        year: int | None,
        grade: int,
    ) -> dict:
        stored = 0
        failed = 0
        duplicates = 0

        for q in questions:
            subject = _SECTION_TO_SUBJECT.get(q.section or "", q.section or "General")
            qhash = q.metadata.get("question_hash") or self._question_hash(q)

            existing = db.query(QuestionBank).filter(QuestionBank.question_hash == qhash).first()
            if existing:
                duplicates += 1
                continue

            try:
                # Use a savepoint to isolate this question's insert
                with db.begin_nested():
                    qb = QuestionBank(
                        grade=grade,
                        subject=subject,
                        chapter=q.section,
                        module=None,
                        question_type=QuestionType.mcq,
                        prompt=q.question_text,
                        options=[f"{o['label']}) {o['text']}" for o in q.options_list()],
                        correct_answer=q.correct_answer or "",
                        textbook_explanation=q.solution_text or "",
                        difficulty=Difficulty.medium,
                        marks=int(q.marks) if q.marks else 1,
                        tags=[q.section] if q.section else [],
                        source_pdf=source.file_name,
                        source_id=source.id,
                        source_page=q.page_number,
                        question_number=q.question_number,
                        section_name=q.section,
                        raw_text=q.raw_block[:5000] if q.raw_block else "",
                        cleaned_text=q.question_text,
                        question_source_type=QuestionSourceType.pdf_extracted,
                        year=year,
                        has_image=q.has_diagram,
                        question_hash=qhash,
                        table_data=q.metadata.get("tables") or None,
                    )
                    db.add(qb)
                    db.flush()

                    for opt in q.options_list():
                        db.add(QuestionOption(
                            question_id=qb.id,
                            label=opt["label"],
                            text=opt["text"],
                            is_correct=opt["is_correct"],
                        ))

                    if q.solution_text:
                        db.add(QuestionExplanation(
                            question_id=qb.id,
                            solution_text=q.solution_text,
                            solution_type="extracted",
                            source_page=q.page_number,
                        ))

                    if q.section:
                        db.add(QuestionTag(question_id=qb.id, tag_key="section", tag_value=q.section))
                    if subject:
                        db.add(QuestionTag(question_id=qb.id, tag_key="subject", tag_value=subject))
                    if year:
                        db.add(QuestionTag(question_id=qb.id, tag_key="year", tag_value=str(year)))

                    qnum = q.question_number or 0
                    if qnum in diagram_association:
                        diagrams = diagram_association[qnum]
                        diagram_processor.store_question_images(db, qb.id, diagrams, q)

                    for image_url in q.metadata.get("images", []):
                        db.add(QuestionImage(
                            question_id=qb.id,
                            image_path=image_url,
                            image_type="diagram",
                            page_number=q.page_number,
                        ))

                # Savepoint succeeded
                stored += 1
            except Exception:
                failed += 1
                logger.exception("Database insert failed for question %s", q.question_number)
                # rollback happens automatically by begin_nested() on exception
                continue

        return {
            "inserted_rows": stored,
            "failed_rows": failed,
            "duplicate_rows": duplicates,
        }

    def _get_or_create_source(
        self,
        db: Session,
        pdf_path: Path,
        file_name: str,
        display_name: str,
        exam_type: str | None,
        year: int | None,
        grade: int | None,
    ) -> QuestionBankSource:
        path_str = str(pdf_path)
        document_hash = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
        existing = db.query(QuestionBankSource).filter(
            (QuestionBankSource.document_hash == document_hash) |
            (QuestionBankSource.file_path == path_str)
        ).first()

        if existing:
            old_questions = db.query(QuestionBank).filter(
                QuestionBank.source_id == existing.id
            ).all()
            for old_q in old_questions:
                db.query(QuestionOption).filter(
                    QuestionOption.question_id == old_q.id
                ).delete()
                db.query(QuestionExplanation).filter(
                    QuestionExplanation.question_id == old_q.id
                ).delete()
                db.query(QuestionTag).filter(
                    QuestionTag.question_id == old_q.id
                ).delete()
                db.delete(old_q)
            existing.extraction_status = ExtractionStatus.pending
            existing.extraction_error = None
            existing.total_questions_extracted = 0
            existing.document_hash = document_hash
            db.flush()
            return existing

        source = QuestionBankSource(
            file_path=path_str,
            file_name=file_name,
            document_hash=document_hash,
            display_name=display_name,
            exam_type=exam_type,
            year=year,
            grade=grade,
        )
        db.add(source)
        db.flush()
        return source

    def _generate_display_name(self, file_name: str) -> str:
        name = Path(file_name).stem
        name = re.sub(r"[_-]+", " ", name)
        name = re.sub(r"\s*\(\d+\)\s*$", "", name)
        return name.strip().title()

    def _detect_year(self, file_name: str) -> int | None:
        match = re.search(r"(20\d{2})", file_name)
        return int(match.group(1)) if match else None

    def _detect_exam_type(self, file_name: str) -> str | None:
        lower = file_name.lower()
        if "navodaya" in lower or "jnv" in lower or "novodaya" in lower:
            return "JNV"
        if "aissee" in lower or "aiseee" in lower or "sainik" in lower:
            return "AISSEE"
        if "pyq" in lower:
            return "PYQ"
        return None

    def _detect_grade(self, file_name: str) -> int | None:
        match = re.search(r"class\s*(\d+)", file_name, re.IGNORECASE)
        return int(match.group(1)) if match else None

    def _debug_dir(self, source_id: int) -> Path:
        d = Path(self.settings.upload_dir) / "pdf_sources" / "debug" / str(source_id)
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _save_debug_artifact(self, source_id: int, filename: str, data) -> None:
        try:
            out_path = self._debug_dir(source_id) / filename
            if isinstance(data, str):
                out_path.write_text(data, encoding="utf-8")
            else:
                out_path.write_text(
                    json.dumps(data, indent=2, default=str, ensure_ascii=False),
                    encoding="utf-8"
                )
            logger.info("Debug artifact saved: %s (%s)", out_path, filename)
        except Exception as e:
            logger.warning("Failed to save debug artifact %s: %s", filename, e)

    def _audit(self, db: Session, source_id: int, action: str, message: str) -> None:
        action_label = _AUDIT_ACTIONS.get(action, action)
        logger.info("[source_id=%d] %s: %s", source_id, action_label, message)


question_extraction_pipeline = QuestionExtractionPipeline()
