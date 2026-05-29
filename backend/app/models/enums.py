from enum import Enum


class Role(str, Enum):
    student = "student"
    parent = "parent"
    admin = "admin"


class SourceType(str, Enum):
    textbook = "textbook"
    pyq = "pyq"
    notes = "notes"


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class QuestionType(str, Enum):
    mcq = "mcq"
    fill_blank = "fill_blank"
    reasoning = "reasoning"


class LinkStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ExtractionStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class QuestionSourceType(str, Enum):
    pdf_extracted = "pdf_extracted"
    manual = "manual"
    ai_generated = "ai_generated"
