"""
Knowledge Base API Schemas
============================
Pydantic schemas for the Knowledge Base Management API.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


# ── Upload ───────────────────────────────────────────────────────────────


class KnowledgeUploadMetadata(BaseModel):
    """Metadata submitted with a document upload."""
    source_type: str | None = None
    exam_type: str | None = None
    subject: str | None = Field(None, alias="subject")
    chapter: str | None = None
    year: int | None = None
    language: str = "English"
    tags: list[str] | None = None

    # Use 'class' as a key name (reserved word workaround)
    doc_class: str | None = Field(None, alias="class")

    class Config:
        populate_by_name = True


# ── Document Responses ───────────────────────────────────────────────────


class KnowledgeDocumentOut(BaseModel):
    """Knowledge document summary."""
    id: int
    file_name: str
    original_file_name: str
    file_size: int
    document_type: str
    source_type: str
    doc_class: str | None
    doc_subject: str | None
    doc_chapter: str | None
    exam_type: str | None
    year: int | None
    language: str
    tags: list[str] | None
    processing_status: str
    processing_error: str | None
    retry_count: int
    total_pages: int
    total_chunks: int
    total_questions: int
    processing_started_at: datetime | None
    processing_completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class KnowledgeDocumentListOut(BaseModel):
    """Paginated document list."""
    total_count: int
    page: int
    limit: int
    data: list[KnowledgeDocumentOut]


class KnowledgeDocumentDetailOut(KnowledgeDocumentOut):
    """Document with processing history."""
    audit_logs: list["AuditLogOut"] = []
    chunk_count_by_type: dict[str, int] = {}
    table_count: int = 0
    image_count: int = 0


# ── Chunks ───────────────────────────────────────────────────────────────


class KnowledgeChunkOut(BaseModel):
    """A single chunk from a document."""
    id: int
    chunk_type: str
    chunk_text: str
    page_number: int | None
    chunk_index: int
    structured_data: dict | None

    class Config:
        from_attributes = True


# ── Audit Logs ───────────────────────────────────────────────────────────


class AuditLogOut(BaseModel):
    """Audit log entry."""
    id: int
    action: str
    stage: str
    details: dict | None
    error_message: str | None
    duration_ms: int | None
    timestamp: datetime

    class Config:
        from_attributes = True


# ── Metadata Registry ───────────────────────────────────────────────────


class MetadataValueOut(BaseModel):
    """A single metadata field value."""
    id: int
    value: str
    label: str
    parent_field: str | None
    parent_value: str | None


class MetadataValueIn(BaseModel):
    """Create a new metadata field value."""
    value: str
    label: str | None = None
    parent_field: str | None = None
    parent_value: str | None = None
    sort_order: int = 0


class MetadataValueUpdateIn(BaseModel):
    """Update a metadata field value."""
    label: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class MetadataSchemaOut(BaseModel):
    """Full metadata schema with all fields and values."""
    fields: dict[str, list[MetadataValueOut]]


# ── Processing Queue ────────────────────────────────────────────────────


class ProcessingJobOut(BaseModel):
    """Processing job status."""
    id: int
    document_id: int
    priority: int
    status: str
    current_stage: str | None = None
    progress_pct: float = 0.0
    attempt_count: int
    max_retries: int
    started_at: datetime | None
    completed_at: datetime | None
    error_message: str | None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Analytics ────────────────────────────────────────────────────────────


class KnowledgeAnalyticsOut(BaseModel):
    """Knowledge base health metrics."""
    total_documents: int
    total_chunks: int
    total_questions: int
    total_embeddings: int
    total_tables: int = 0
    total_images: int = 0
    total_versions: int = 0

    documents_by_status: dict[str, int]
    documents_by_type: dict[str, int]
    documents_by_source: dict[str, int]

    duplicate_rate: float
    processing_failure_rate: float
    ocr_success_rate: float
    avg_processing_time_ms: int
    pending_jobs: int = 0
    failed_jobs: int = 0

    vector_store_health: dict


class IngestionMetricsOut(BaseModel):
    """Ingestion pipeline performance metrics."""
    total_processed: int
    total_failed: int
    total_queued: int
    avg_chunks_per_doc: float
    avg_pages_per_doc: float
    recent_jobs: list[ProcessingJobOut]


# ── Search ───────────────────────────────────────────────────────────────


class KnowledgeSearchIn(BaseModel):
    """Search parameters."""
    query: str = Field(min_length=1)
    doc_class: str | None = None
    subject: str | None = None
    chapter: str | None = None
    exam_type: str | None = None
    year: int | None = None
    source_type: str | None = None
    limit: int = Field(default=10, ge=1, le=50)


class KnowledgeSearchResultOut(BaseModel):
    """A single search result."""
    chunk_id: int
    document_id: int
    chunk_text: str
    chunk_type: str
    page_number: int | None
    score: float
    document_name: str
    subject: str | None
    chapter: str | None


# ── Knowledge Table / Image / Version (Phase 3) ─────────────────────────


class KnowledgeTableOut(BaseModel):
    """Extracted table."""
    id: int
    document_id: int
    page_number: int
    table_index: int
    table_json: dict
    table_markdown: str
    table_text: str
    row_count: int
    col_count: int
    extraction_method: str
    caption: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class KnowledgeImageOut(BaseModel):
    """Extracted and understood image."""
    id: int
    document_id: int
    page_number: int
    image_index: int
    image_path: str
    content_type: str
    caption: str
    detected_text: str
    vision_context: str
    concepts: list | None
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentVersionOut(BaseModel):
    """Document version entry."""
    id: int
    document_id: int
    version_number: int
    file_hash: str
    file_size: int
    is_active: bool
    change_reason: str | None
    uploaded_by_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True
