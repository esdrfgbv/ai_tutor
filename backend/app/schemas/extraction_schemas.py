"""
Pydantic schemas for the PDF Question Bank Extraction API.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


# ─── PDF Upload / Import ─────────────────────────────────────────────────────


class PDFUploadIn(BaseModel):
    """Metadata hints for an uploaded PDF."""
    exam_type: str | None = None
    year: int | None = None
    grade: int | None = None
    display_name: str | None = None


class LocalImportIn(BaseModel):
    """Request to import PDFs from a local directory."""
    directory: str = Field(..., description="One of: mock_test_papers, navodaya_pyqs, aiseee_pyqs")
    exam_type: str | None = None
    grade: int | None = None


# ─── Extraction Job Responses ────────────────────────────────────────────────


class ExtractionJobOut(BaseModel):
    """Extraction job status response."""
    id: int
    file_name: str
    display_name: str
    exam_type: str | None
    year: int | None
    grade: int | None
    total_pages: int
    total_questions_extracted: int
    extraction_status: str
    extraction_error: str | None
    processed_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class ExtractionStatsOut(BaseModel):
    """Aggregate extraction statistics."""
    total_sources: int
    total_questions: int
    completed_sources: int
    failed_sources: int
    pending_sources: int
    questions_by_subject: dict[str, int]
    questions_by_year: dict[str, int]
    questions_by_section: dict[str, int]


class ExtractionResultOut(BaseModel):
    """Result of a single PDF extraction."""
    source_id: int
    file_name: str
    total_pages: int = 0
    total_questions: int = 0
    sections_found: list[str] = []
    answer_key_size: int = 0
    status: str
    error: str | None = None


# ─── Enhanced Question Bank ──────────────────────────────────────────────────


class QuestionBankSearchParams(BaseModel):
    """Search/filter parameters for the question bank."""
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=200)
    subject: str | None = None
    grade: int | None = None
    chapter: str | None = None
    section: str | None = None
    source_pdf: str | None = None
    source_id: int | None = None
    year: int | None = None
    difficulty: str | None = None
    question_type: str | None = None
    search: str | None = None
    has_image: bool | None = None


class QuestionOptionOut(BaseModel):
    """Single option for a question."""
    label: str
    text: str
    is_correct: bool

    class Config:
        from_attributes = True


class QuestionBankItemOut(BaseModel):
    """Full question card response with source info."""
    id: int
    grade: int
    subject: str
    chapter: str | None
    section_name: str | None
    prompt: str
    options: list[str] | None
    structured_options: list[QuestionOptionOut] = []
    correct_answer: str
    difficulty: str
    marks: int
    source_pdf: str | None
    source_page: int | None
    question_number: int | None
    year: int | None
    has_image: bool
    tags: list[str] | None
    question_source_type: str

    class Config:
        from_attributes = True


class QuestionBankListOut(BaseModel):
    """Paginated list of questions."""
    total_count: int
    page: int
    limit: int
    data: list[QuestionBankItemOut]


class SourceFilterOut(BaseModel):
    """Available source PDFs for filter dropdown."""
    id: int
    file_name: str
    display_name: str
    question_count: int


class SectionFilterOut(BaseModel):
    """Available sections for filter dropdown."""
    section_name: str
    question_count: int


class YearFilterOut(BaseModel):
    """Available years for filter dropdown."""
    year: int
    question_count: int


# ─── Random Test Generation ─────────────────────────────────────────────────


class SubjectConstraint(BaseModel):
    """Constraint for a specific subject/section in random generation."""
    subject: str
    count: int = Field(ge=1)
    difficulty: str | None = None


class RandomTestGenerateIn(BaseModel):
    """Constraints for auto-generating a test from the question bank."""
    title: str
    grade: int = Field(ge=4, le=9)
    duration_minutes: int = Field(default=60, ge=5, le=180)
    subject_constraints: list[SubjectConstraint] = []
    total_questions: int = Field(default=20, ge=1, le=100)
    difficulty: str | None = None
    year: int | None = None
    source_ids: list[int] = []
    description: str | None = None
    negative_marking: float = 0.0


# ─── Mock Test Builder ──────────────────────────────────────────────────────


class BulkSelectionIn(BaseModel):
    """Batch question selection for mock test builder."""
    question_ids: list[int] = Field(..., min_length=1)


class MockTestFromSelectionIn(BaseModel):
    """Create a mock test from selected question bank IDs."""
    title: str
    description: str | None = None
    duration_minutes: int = Field(default=60, ge=5, le=180)
    total_marks: int = Field(default=100, ge=1)
    negative_marking: float = 0.0
    question_ids: list[int] = Field(..., min_length=1)
    targets: list[dict] = []
    start_time: datetime | None = None
    end_time: datetime | None = None
