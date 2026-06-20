from enum import Enum


class Role(str, Enum):
    student = "student"
    parent = "parent"
    admin = "admin"


class SourceType(str, Enum):
    textbook = "textbook"
    pyq = "pyq"
    notes = "notes"
    mock_test = "mock_test"
    worksheet = "worksheet"
    reference_material = "reference_material"


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


# ── Knowledge Base Enums ─────────────────────────────────────────────────


class DocumentType(str, Enum):
    pdf = "pdf"
    docx = "docx"
    image = "image"
    txt = "txt"


class ProcessingStatus(str, Enum):
    """Tracks document pipeline stage (used on KnowledgeDocument)."""
    queued = "queued"
    validating = "validating"
    extracting = "extracting"
    parsing_layout = "parsing_layout"
    extracting_tables = "extracting_tables"
    extracting_images = "extracting_images"
    chunking = "chunking"
    deduplicating = "deduplicating"
    embedding = "embedding"
    completed = "completed"
    failed = "failed"


class JobStatus(str, Enum):
    """Tracks async job lifecycle (used on ProcessingJob)."""
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"
    retrying = "retrying"
    dead_letter = "dead_letter"


class ChunkType(str, Enum):
    text = "text"
    table = "table"
    image_context = "image_context"
    equation = "equation"
    heading = "heading"
    question_block = "question_block"
    table_chunk = "table_chunk"
    image_chunk = "image_chunk"


class VisionContentType(str, Enum):
    figure = "figure"
    diagram = "diagram"
    graph = "graph"
    flowchart = "flowchart"
    map = "map"
    geometry_figure = "geometry_figure"
    scientific_illustration = "scientific_illustration"
    labeled_image = "labeled_image"
    question_figure = "question_figure"
    generic = "generic"


class IngestionAction(str, Enum):
    uploaded = "uploaded"
    validated = "validated"
    text_extracted = "text_extracted"
    layout_parsed = "layout_parsed"
    tables_extracted = "tables_extracted"
    images_extracted = "images_extracted"
    vision_processed = "vision_processed"
    chunked = "chunked"
    deduplicated = "deduplicated"
    embedded = "embedded"
    completed = "completed"
    failed = "failed"
    retried = "retried"
    version_created = "version_created"
