"""
PDF Question Extraction Engine
================================
Processes exam PDFs to extract structured MCQ questions, options, answers,
explanations, and section metadata.

Pipeline:
  PDF → Text Extraction → Section Detection → Question Detection
  → Option Parsing → Answer Matching → Classification → DB Storage
"""

from __future__ import annotations

import re
import logging
from datetime import datetime
from pathlib import Path

import fitz  # PyMuPDF
import pdfplumber

from sqlalchemy.orm import Session

from app.models.enums import (
    Difficulty,
    ExtractionStatus,
    QuestionSourceType,
    QuestionType,
)
from app.models.models import (
    QuestionBank,
    QuestionBankSource,
    QuestionExplanation,
    QuestionImage,
    QuestionOption,
    QuestionTag,
)

logger = logging.getLogger(__name__)

# ─── Regex patterns ──────────────────────────────────────────────────────────

# Matches question numbers like "41.", "42)", "Q.41", "Question 41:"
QUESTION_START_RE = re.compile(
    r"(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*[.):\s]\s*",
    re.MULTILINE,
)

# Matches options like "(a)", "(A)", "a)", "A.", etc.
OPTION_RE = re.compile(
    r"\s*\(?\s*([A-Da-d])\s*[.)]\s*(.+?)(?=\s*\(?\s*[A-Da-d]\s*[.)]|\s*$)",
    re.DOTALL,
)

# Matches answer keys like "41. (a)", "Ans: c", "Answer: B", "41. A"
ANSWER_KEY_RE = re.compile(
    r"(?:^|\n)\s*(?:Ans(?:wer)?\.?\s*[:.]?\s*)?(\d{1,3})\s*[.:)]\s*\(?\s*([A-Da-d])\s*\)?",
    re.MULTILINE | re.IGNORECASE,
)

# Single-line answer pattern: "41. (a)" at end of paper
ANSWER_INLINE_RE = re.compile(
    r"(\d{1,3})\s*[.)]\s*\(?\s*([A-Da-d])\s*\)?",
    re.IGNORECASE,
)

# Section header patterns
SECTION_PATTERNS = [
    (re.compile(r"(?:section|part)\s*[-–:]?\s*(?:i+|[a-e]|[1-5])\s*[-–:]?\s*mental\s*ability", re.IGNORECASE), "Mental Ability"),
    (re.compile(r"mental\s*ability\s*(?:test|section)?", re.IGNORECASE), "Mental Ability"),
    (re.compile(r"(?:section|part)\s*[-–:]?\s*(?:i+|[a-e]|[1-5])\s*[-–:]?\s*arithmetic\s*(?:test)?", re.IGNORECASE), "Arithmetic Test"),
    (re.compile(r"arithmetic\s*(?:test|section)", re.IGNORECASE), "Arithmetic Test"),
    (re.compile(r"(?:section|part)\s*[-–:]?\s*(?:i+|[a-e]|[1-5])\s*[-–:]?\s*language\s*(?:test)?", re.IGNORECASE), "Language Test"),
    (re.compile(r"language\s*(?:test|section)", re.IGNORECASE), "Language Test"),
    (re.compile(r"(?:section|part)\s*[-–:]?\s*(?:i+|[a-e]|[1-5])\s*[-–:]?\s*(?:math(?:ematics)?|maths)", re.IGNORECASE), "Mathematics"),
    (re.compile(r"math(?:ematics|s)?\s*(?:test|section)", re.IGNORECASE), "Mathematics"),
    (re.compile(r"(?:section|part)\s*[-–:]?\s*(?:i+|[a-e]|[1-5])\s*[-–:]?\s*(?:english|language)", re.IGNORECASE), "English"),
    (re.compile(r"english\s*(?:test|section)", re.IGNORECASE), "English"),
    (re.compile(r"(?:section|part)\s*[-–:]?\s*(?:i+|[a-e]|[1-5])\s*[-–:]?\s*(?:science|gk|general\s*knowledge)", re.IGNORECASE), "Science"),
    (re.compile(r"(?:science|general\s*knowledge)\s*(?:test|section)", re.IGNORECASE), "Science"),
    (re.compile(r"reasoning\s*(?:test|section|ability)?", re.IGNORECASE), "Reasoning"),
]

# Subject classification from section names
SECTION_TO_SUBJECT = {
    "Mental Ability": "Mental Ability",
    "Arithmetic Test": "Mathematics",
    "Mathematics": "Mathematics",
    "Language Test": "English",
    "English": "English",
    "Science": "Science",
    "General Knowledge": "General Knowledge",
    "Reasoning": "Mental Ability",
}

# Answer key section header detection
ANSWER_SECTION_RE = re.compile(
    r"(?:answer\s*key|answers|solution|answer\s*sheet|correct\s*answers)",
    re.IGNORECASE,
)


# ─── Data classes ─────────────────────────────────────────────────────────────

class ExtractedQuestion:
    """Intermediate representation of an extracted question."""

    def __init__(self):
        self.number: int | None = None
        self.text: str = ""
        self.raw_text: str = ""
        self.options: list[dict] = []  # [{"label": "A", "text": "..."}, ...]
        self.correct_answer: str | None = None
        self.explanation: str | None = None
        self.section: str | None = None
        self.subject: str | None = None
        self.page_number: int | None = None
        self.has_image: bool = False
        self.difficulty: str = "medium"

    def to_dict(self) -> dict:
        return {
            "number": self.number,
            "text": self.text,
            "raw_text": self.raw_text,
            "options": self.options,
            "correct_answer": self.correct_answer,
            "explanation": self.explanation,
            "section": self.section,
            "subject": self.subject,
            "page_number": self.page_number,
            "has_image": self.has_image,
            "difficulty": self.difficulty,
        }


class PageContent:
    """Represents extracted text from a single PDF page."""

    def __init__(self, page_number: int, text: str):
        self.page_number = page_number
        self.text = text
        self.section: str | None = None


# ─── Main Extractor Class ────────────────────────────────────────────────────

class PDFQuestionExtractor:
    """
    Extracts structured MCQ questions from exam PDFs.

    Usage:
        extractor = PDFQuestionExtractor()
        result = extractor.extract_from_pdf(pdf_path, db, source_metadata)
    """

    def __init__(self):
        self._use_pdfplumber_fallback = True

    # ─── Public entry point ──────────────────────────────────────────────

    def extract_from_pdf(
        self,
        pdf_path: Path,
        db: Session,
        *,
        exam_type: str | None = None,
        year: int | None = None,
        grade: int | None = None,
        display_name: str | None = None,
    ) -> dict:
        """
        Main entry point. Processes a PDF and stores extracted questions.

        Returns dict with extraction stats.
        """
        pdf_path = Path(pdf_path).resolve()
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        file_name = pdf_path.name
        if display_name is None:
            display_name = self._generate_display_name(file_name)

        # Auto-detect metadata from filename
        if year is None:
            year = self._detect_year(file_name)
        if exam_type is None:
            exam_type = self._detect_exam_type(file_name)
        if grade is None:
            grade = self._detect_grade(file_name)

        # Create or get source record
        source = self._get_or_create_source(
            db, pdf_path, file_name, display_name, exam_type, year, grade
        )
        source.extraction_status = ExtractionStatus.processing
        db.flush()

        try:
            # Step 1: Extract text from all pages
            pages = self._extract_text_pages(pdf_path)
            source.total_pages = len(pages)

            # Step 2: Detect sections across pages
            self._detect_sections(pages)

            # Step 3: Extract full text and answer key
            full_text = "\n".join(p.text for p in pages)
            answer_key = self._extract_answer_key(full_text)

            # Step 4: Extract questions from each page
            all_questions: list[ExtractedQuestion] = []
            for page in pages:
                questions = self._extract_questions_from_page(page)
                all_questions.extend(questions)

            # Step 5: Match answers
            if answer_key:
                self._match_answers(all_questions, answer_key)

            # Step 6: Deduplicate
            all_questions = self._deduplicate(all_questions)

            # Step 7: Store in database
            stored_count = self._store_questions(
                db, source, all_questions, year=year, grade=grade or 6
            )

            source.total_questions_extracted = stored_count
            source.extraction_status = ExtractionStatus.completed
            source.processed_at = datetime.utcnow()
            db.commit()

            logger.info(
                "Extracted %d questions from %s (%d pages)",
                stored_count, file_name, len(pages),
            )

            return {
                "source_id": source.id,
                "file_name": file_name,
                "total_pages": len(pages),
                "total_questions": stored_count,
                "sections_found": list({q.section for q in all_questions if q.section}),
                "answer_key_size": len(answer_key),
                "status": "completed",
            }

        except Exception as exc:
            source.extraction_status = ExtractionStatus.failed
            source.extraction_error = str(exc)[:2000]
            db.commit()
            logger.error("Extraction failed for %s: %s", file_name, exc, exc_info=True)
            return {
                "source_id": source.id,
                "file_name": file_name,
                "status": "failed",
                "error": str(exc),
            }

    # ─── Text Extraction ─────────────────────────────────────────────────

    def _extract_text_pages(self, pdf_path: Path) -> list[PageContent]:
        """Extract text from PDF using PyMuPDF with OCR fallback for scanned images."""
        pages: list[PageContent] = []
        
        try:
            import pytesseract
            from PIL import Image
            import io
            has_ocr = True
        except ImportError:
            has_ocr = False
            logger.warning("pytesseract or PIL not installed. OCR fallback disabled.")

        try:
            doc = fitz.open(str(pdf_path))
            for idx, page in enumerate(doc, start=1):
                text = page.get_text("text")
                
                # If no text found, try OCR
                if (not text or not text.strip()) and has_ocr:
                    logger.info("No text found on page %d, trying OCR", idx)
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better OCR
                    img = Image.open(io.BytesIO(pix.tobytes("png")))
                    text = pytesseract.image_to_string(img)
                
                if text and text.strip():
                    pages.append(PageContent(idx, text))
                    
            doc.close()
        except Exception as e:
            logger.error("Error extracting text from %s: %s", pdf_path, e)

        return pages

    # ─── Section Detection ───────────────────────────────────────────────

    def _detect_sections(self, pages: list[PageContent]) -> None:
        """Detect section headers across pages and tag each page."""
        current_section: str | None = None

        for page in pages:
            detected = self._find_section_in_text(page.text)
            if detected:
                current_section = detected
            page.section = current_section

    def _find_section_in_text(self, text: str) -> str | None:
        """Check text for section header patterns."""
        for pattern, section_name in SECTION_PATTERNS:
            if pattern.search(text):
                return section_name
        return None

    # ─── Question Extraction ─────────────────────────────────────────────

    def _extract_questions_from_page(self, page: PageContent) -> list[ExtractedQuestion]:
        """Extract individual questions from a page's text."""
        questions: list[ExtractedQuestion] = []
        text = page.text

        # Skip answer key pages
        if ANSWER_SECTION_RE.search(text[:200]):
            return questions

        # Find all question starts
        matches = list(QUESTION_START_RE.finditer(text))
        if not matches:
            return questions

        for i, match in enumerate(matches):
            q = ExtractedQuestion()
            q.number = int(match.group(1))
            q.page_number = page.page_number
            q.section = page.section
            q.subject = SECTION_TO_SUBJECT.get(page.section, page.section) if page.section else None

            # Get question text (up to next question or end)
            start_pos = match.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            raw_block = text[start_pos:end_pos].strip()
            q.raw_text = raw_block

            # Parse options from the block
            options = self._parse_options(raw_block)
            if options:
                # Question text is everything before the first option
                first_opt_match = re.search(
                    r"\s*\(?\s*[Aa]\s*[.)]\s*", raw_block
                )
                if first_opt_match:
                    q.text = raw_block[:first_opt_match.start()].strip()
                else:
                    q.text = raw_block
                q.options = options
            else:
                q.text = raw_block

            # Clean up question text
            q.text = self._clean_text(q.text)

            # Only add if we got a meaningful question
            if len(q.text) > 5 and len(q.options) >= 2:
                questions.append(q)

        return questions

    def _parse_options(self, text: str) -> list[dict]:
        """Parse MCQ options from text block."""
        options: list[dict] = []
        seen_labels: set[str] = set()

        # Try structured option pattern first
        # Matches (a) text, (b) text, (c) text, (d) text
        option_pattern = re.compile(
            r"\(?\s*([A-Da-d])\s*[.)]\s*(.+?)(?=\(?\s*[A-Da-d]\s*[.)]|$)",
            re.DOTALL,
        )

        for m in option_pattern.finditer(text):
            label = m.group(1).upper()
            option_text = m.group(2).strip()
            # Clean trailing whitespace and newlines
            option_text = re.sub(r"\s+", " ", option_text).strip()

            if label not in seen_labels and option_text:
                options.append({"label": label, "text": option_text})
                seen_labels.add(label)

        return options

    # ─── Answer Key Extraction ───────────────────────────────────────────

    def _extract_answer_key(self, full_text: str) -> dict[int, str]:
        """
        Extract answer key from the document.
        Returns {question_number: correct_answer_label}.
        """
        answer_key: dict[int, str] = {}

        # First look for dedicated answer key section
        answer_section_match = ANSWER_SECTION_RE.search(full_text)
        if answer_section_match:
            answer_text = full_text[answer_section_match.start():]
            for m in ANSWER_INLINE_RE.finditer(answer_text):
                qnum = int(m.group(1))
                ans = m.group(2).upper()
                if 1 <= qnum <= 200:
                    answer_key[qnum] = ans

        # Also try matching from inline answers
        if not answer_key:
            for m in ANSWER_KEY_RE.finditer(full_text):
                qnum = int(m.group(1))
                ans = m.group(2).upper()
                if 1 <= qnum <= 200:
                    answer_key[qnum] = ans

        return answer_key

    def _match_answers(
        self, questions: list[ExtractedQuestion], answer_key: dict[int, str]
    ) -> None:
        """Match extracted answer key to questions."""
        for q in questions:
            if q.number and q.number in answer_key:
                q.correct_answer = answer_key[q.number]

    # ─── Deduplication ───────────────────────────────────────────────────

    def _deduplicate(self, questions: list[ExtractedQuestion]) -> list[ExtractedQuestion]:
        """Remove duplicate questions based on question number."""
        seen: dict[int, ExtractedQuestion] = {}
        for q in questions:
            if q.number is not None:
                if q.number not in seen or len(q.text) > len(seen[q.number].text):
                    seen[q.number] = q
            else:
                seen[id(q)] = q
        return list(seen.values())

    # ─── Database Storage ────────────────────────────────────────────────

    def _store_questions(
        self,
        db: Session,
        source: QuestionBankSource,
        questions: list[ExtractedQuestion],
        *,
        year: int | None,
        grade: int,
    ) -> int:
        """Store extracted questions into the database."""
        stored = 0

        for q in questions:
            # Build option strings for legacy JSON column
            option_strings = [f"{opt['label']}) {opt['text']}" for opt in q.options]

            # Determine correct answer text
            correct_ans = q.correct_answer or ""
            if correct_ans and q.options:
                for opt in q.options:
                    if opt["label"] == correct_ans:
                        correct_ans = opt["label"]
                        break

            subject = q.subject or source.exam_type or "General"

            qb = QuestionBank(
                grade=grade,
                subject=subject,
                chapter=q.section,
                module=None,
                question_type=QuestionType.mcq,
                prompt=q.text,
                options=option_strings,
                correct_answer=correct_ans,
                textbook_explanation=q.explanation or "",
                difficulty=Difficulty.medium,
                marks=1,
                tags=[q.section] if q.section else [],
                source_pdf=source.file_name,
                # PDF provenance
                source_id=source.id,
                source_page=q.page_number,
                question_number=q.number,
                section_name=q.section,
                raw_text=q.raw_text,
                cleaned_text=q.text,
                question_source_type=QuestionSourceType.pdf_extracted,
                year=year,
                has_image=q.has_image,
            )
            db.add(qb)
            db.flush()

            # Store normalized options
            for opt in q.options:
                is_correct = (opt["label"] == q.correct_answer) if q.correct_answer else False
                db.add(QuestionOption(
                    question_id=qb.id,
                    label=opt["label"],
                    text=opt["text"],
                    is_correct=is_correct,
                ))

            # Store explanation if present
            if q.explanation:
                db.add(QuestionExplanation(
                    question_id=qb.id,
                    solution_text=q.explanation,
                    solution_type="extracted",
                    source_page=q.page_number,
                ))

            # Store tags
            if q.section:
                db.add(QuestionTag(question_id=qb.id, tag_key="section", tag_value=q.section))
            if q.subject:
                db.add(QuestionTag(question_id=qb.id, tag_key="subject", tag_value=q.subject))
            if year:
                db.add(QuestionTag(question_id=qb.id, tag_key="year", tag_value=str(year)))

            stored += 1

        return stored

    # ─── Source Management ───────────────────────────────────────────────

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
        """Get existing source record or create a new one."""
        path_str = str(pdf_path)
        existing = db.query(QuestionBankSource).filter(
            QuestionBankSource.file_path == path_str
        ).first()

        if existing:
            # Reset for reprocessing
            db.query(QuestionBank).filter(QuestionBank.source_id == existing.id).delete()
            existing.extraction_status = ExtractionStatus.pending
            existing.extraction_error = None
            existing.total_questions_extracted = 0
            db.flush()
            return existing

        source = QuestionBankSource(
            file_path=path_str,
            file_name=file_name,
            display_name=display_name,
            exam_type=exam_type,
            year=year,
            grade=grade,
        )
        db.add(source)
        db.flush()
        return source

    # ─── Utility Methods ─────────────────────────────────────────────────

    def _clean_text(self, text: str) -> str:
        """Clean extracted text."""
        # Collapse whitespace
        text = re.sub(r"\s+", " ", text).strip()
        # Remove leading/trailing punctuation artifacts
        text = text.strip(".-–—: ")
        return text

    def _generate_display_name(self, file_name: str) -> str:
        """Generate a human-readable display name from a filename."""
        name = Path(file_name).stem
        # Clean common patterns
        name = re.sub(r"[_-]+", " ", name)
        name = re.sub(r"\s*\(\d+\)\s*$", "", name)  # Remove (1) suffix
        return name.strip().title()

    def _detect_year(self, file_name: str) -> int | None:
        """Detect year from filename."""
        match = re.search(r"(20\d{2})", file_name)
        return int(match.group(1)) if match else None

    def _detect_exam_type(self, file_name: str) -> str | None:
        """Detect exam type from filename."""
        lower = file_name.lower()
        if "navodaya" in lower or "jnv" in lower or "novodaya" in lower or "navodaya" in lower:
            return "JNV"
        if "aissee" in lower or "aiseee" in lower or "sainik" in lower:
            return "AISSEE"
        if "pyq" in lower:
            return "PYQ"
        return None

    def _detect_grade(self, file_name: str) -> int | None:
        """Detect grade/class from filename."""
        match = re.search(r"class\s*(\d+)", file_name, re.IGNORECASE)
        return int(match.group(1)) if match else None


# ─── Batch import utility ────────────────────────────────────────────────────

def import_pdfs_from_directory(
    db: Session,
    directory: Path,
    *,
    exam_type: str | None = None,
    grade: int | None = None,
) -> list[dict]:
    """
    Import all PDFs from a directory.

    Returns list of extraction results.
    """
    extractor = PDFQuestionExtractor()
    results: list[dict] = []

    if not directory.exists():
        logger.warning("Directory not found: %s", directory)
        return results

    pdf_files = sorted(directory.glob("*.pdf"))
    logger.info("Found %d PDFs in %s", len(pdf_files), directory)

    for pdf_path in pdf_files:
        logger.info("Processing: %s", pdf_path.name)
        result = extractor.extract_from_pdf(
            pdf_path,
            db,
            exam_type=exam_type,
            grade=grade,
        )
        results.append(result)

    return results


# Module-level singleton
pdf_question_extractor = PDFQuestionExtractor()
