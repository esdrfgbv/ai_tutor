"""
Knowledge Base Models
======================
Database models for the Knowledge Base Management System.

Tables:
  - KnowledgeDocument: Tracks uploaded documents through the ingestion lifecycle
  - KnowledgeChunk: Text/table/image chunks extracted from documents
  - KnowledgeEmbedding: Maps chunks to vector store IDs
  - CanonicalQuestion: Deduplicated question repository
  - QuestionSourceLink: Many-to-many between questions and source documents
  - MetadataRegistry: Database-driven metadata field values (no hardcoded dropdowns)
  - IngestionAuditLog: Full audit trail for document processing
  - ProcessingJob: Job queue for async document processing
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import (
    ChunkType,
    Difficulty,
    DocumentType,
    IngestionAction,
    JobStatus,
    ProcessingStatus,
    SourceType,
    VisionContentType,
)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


# ── Core Document Storage ────────────────────────────────────────────────


class KnowledgeDocument(Base, TimestampMixin):
    """
    Tracks every uploaded document through the complete ingestion lifecycle.
    Replaces the old PdfMetadata for new KB-managed content.
    """

    __tablename__ = "knowledge_documents"
    __table_args__ = (
        UniqueConstraint("file_hash", name="uq_knowledge_doc_hash"),
        Index("ix_kd_status", "processing_status"),
        Index("ix_kd_source_type", "source_type"),
        Index("ix_kd_metadata_lookup", "doc_class", "doc_subject", "doc_chapter"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    file_name: Mapped[str] = mapped_column(String(260), nullable=False)
    original_file_name: Mapped[str] = mapped_column(String(260), nullable=False)
    file_path: Mapped[str] = mapped_column(String(700), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA256
    content_fingerprint: Mapped[str | None] = mapped_column(String(64))  # SimHash
    document_type: Mapped[DocumentType] = mapped_column(
        Enum(DocumentType), nullable=False
    )
    source_type: Mapped[SourceType] = mapped_column(
        Enum(SourceType), nullable=False, default=SourceType.textbook
    )

    # ── Dynamic metadata (database-driven, no hardcoding) ──
    doc_class: Mapped[str | None] = mapped_column(String(20), index=True)
    doc_subject: Mapped[str | None] = mapped_column(String(80), index=True)
    doc_chapter: Mapped[str | None] = mapped_column(String(220), index=True)
    exam_type: Mapped[str | None] = mapped_column(String(80), index=True)
    year: Mapped[int | None] = mapped_column(Integer, index=True)
    language: Mapped[str] = mapped_column(String(50), nullable=False, default="English")
    tags: Mapped[list | None] = mapped_column(JSON)
    extra_metadata: Mapped[dict | None] = mapped_column(JSON)

    # ── Processing state ──
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        Enum(ProcessingStatus), default=ProcessingStatus.queued, nullable=False
    )
    processing_error: Mapped[str | None] = mapped_column(Text)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_pages: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_chunks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    processing_started_at: Mapped[datetime | None] = mapped_column(DateTime)
    processing_completed_at: Mapped[datetime | None] = mapped_column(DateTime)

    uploaded_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), index=True
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Relationships ──
    chunks: Mapped[list["KnowledgeChunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list["IngestionAuditLog"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    question_sources: Mapped[list["QuestionSourceLink"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    processing_jobs: Mapped[list["ProcessingJob"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class KnowledgeChunk(Base, TimestampMixin):
    """
    A chunk of content extracted from a document.
    Can be text, table JSON, image context, or a question block.
    """

    __tablename__ = "knowledge_chunks"
    __table_args__ = (
        UniqueConstraint("chunk_hash", "document_id", name="uq_chunk_hash_doc"),
        Index("ix_kc_doc", "document_id"),
        Index("ix_kc_type", "chunk_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_documents.id"), nullable=False
    )
    chunk_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA256
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_type: Mapped[ChunkType] = mapped_column(
        Enum(ChunkType), default=ChunkType.text, nullable=False
    )
    page_number: Mapped[int | None] = mapped_column(Integer)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    parent_chunk_id: Mapped[int | None] = mapped_column(
        ForeignKey("knowledge_chunks.id")
    )

    # ── Structured data for special chunk types ──
    structured_data: Mapped[dict | None] = mapped_column(JSON)
    # For tables: {"table_title": "", "headers": [], "rows": []}
    # For images: {"image_path": "", "description": "", "image_type": ""}

    # ── Metadata inherited from document ──
    doc_class: Mapped[str | None] = mapped_column(String(20))
    doc_subject: Mapped[str | None] = mapped_column(String(80))
    doc_chapter: Mapped[str | None] = mapped_column(String(220))
    source_type: Mapped[SourceType | None] = mapped_column(Enum(SourceType))

    # ── Relationships ──
    document: Mapped[KnowledgeDocument] = relationship(back_populates="chunks")
    embedding: Mapped["KnowledgeEmbedding | None"] = relationship(
        back_populates="chunk", cascade="all, delete-orphan", uselist=False
    )
    children: Mapped[list["KnowledgeChunk"]] = relationship(
        back_populates="parent", remote_side=[id]
    )
    parent: Mapped["KnowledgeChunk | None"] = relationship(
        back_populates="children", remote_side=[parent_chunk_id]
    )


class KnowledgeEmbedding(Base, TimestampMixin):
    """Maps a chunk to its vector in the vector store."""

    __tablename__ = "knowledge_embeddings"
    __table_args__ = (
        UniqueConstraint("vector_id", name="uq_ke_vector_id"),
        UniqueConstraint("chunk_id", name="uq_ke_chunk_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    chunk_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_chunks.id"), nullable=False
    )
    vector_id: Mapped[str] = mapped_column(String(160), nullable=False)
    collection_name: Mapped[str] = mapped_column(
        String(120), nullable=False, default="knowledge_base"
    )

    chunk: Mapped[KnowledgeChunk] = relationship(back_populates="embedding")


# ── Deduplicated Question Repository ────────────────────────────────────


class CanonicalQuestion(Base, TimestampMixin):
    """
    Deduplicated master question record.
    The same question appearing in multiple PYQs / mock tests
    exists only once here, with multiple QuestionSourceLinks.
    """

    __tablename__ = "canonical_questions"
    __table_args__ = (
        UniqueConstraint("canonical_hash", name="uq_canonical_hash"),
        Index("ix_cq_subject", "subject"),
        Index("ix_cq_chapter", "chapter"),
        Index("ix_cq_difficulty", "difficulty"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    canonical_hash: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # hash(normalized question + sorted options)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list | None] = mapped_column(JSON)
    answer: Mapped[str] = mapped_column(Text, nullable=False, default="")
    explanation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    difficulty: Mapped[Difficulty] = mapped_column(
        Enum(Difficulty), default=Difficulty.medium, nullable=False
    )
    topic: Mapped[str | None] = mapped_column(String(220), index=True)
    chapter: Mapped[str | None] = mapped_column(String(220))
    subject: Mapped[str | None] = mapped_column(String(80))
    doc_class: Mapped[str | None] = mapped_column(String(20))
    has_image: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    image_context: Mapped[str | None] = mapped_column(Text)

    # ── Relationships ──
    sources: Mapped[list["QuestionSourceLink"]] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )


class QuestionSourceLink(Base, TimestampMixin):
    """
    Many-to-many: links a canonical question to the document(s) it was extracted from.
    Allows the same question to reference multiple source PDFs (PYQs, mock tests, etc.).
    """

    __tablename__ = "question_source_links"
    __table_args__ = (
        UniqueConstraint(
            "question_id", "document_id", name="uq_question_document"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("canonical_questions.id"), nullable=False, index=True
    )
    document_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_documents.id"), nullable=False, index=True
    )
    source_type: Mapped[SourceType] = mapped_column(
        Enum(SourceType), nullable=False, default=SourceType.textbook
    )
    page_number: Mapped[int | None] = mapped_column(Integer)
    question_number: Mapped[int | None] = mapped_column(Integer)
    extraction_confidence: Mapped[float] = mapped_column(
        Float, default=1.0, nullable=False
    )

    question: Mapped[CanonicalQuestion] = relationship(back_populates="sources")
    document: Mapped[KnowledgeDocument] = relationship(
        back_populates="question_sources"
    )


# ── Database-Driven Metadata ────────────────────────────────────────────


class MetadataRegistry(Base, TimestampMixin):
    """
    Stores all valid metadata field values.
    Replaces hardcoded dropdowns for class, subject, chapter, exam_type, etc.
    Supports hierarchical relationships (e.g., chapters filtered by subject).
    """

    __tablename__ = "metadata_registry"
    __table_args__ = (
        UniqueConstraint("field_name", "field_value", name="uq_metadata_field_value"),
        Index("ix_mr_field", "field_name"),
        Index("ix_mr_parent", "parent_field", "parent_value"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    field_name: Mapped[str] = mapped_column(
        String(80), nullable=False
    )  # class, subject, chapter, exam_type, source_type, language
    field_value: Mapped[str] = mapped_column(String(220), nullable=False)
    display_label: Mapped[str] = mapped_column(String(220), nullable=False)

    # ── Hierarchy: e.g., chapter belongs to a specific subject ──
    parent_field: Mapped[str | None] = mapped_column(String(80))
    parent_value: Mapped[str | None] = mapped_column(String(220))

    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


# ── Audit & Processing ──────────────────────────────────────────────────


class IngestionAuditLog(Base):
    """Full audit trail for every processing stage of a document."""

    __tablename__ = "ingestion_audit_logs"
    __table_args__ = (
        Index("ix_ial_doc", "document_id"),
        Index("ix_ial_action", "action"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_documents.id"), nullable=False
    )
    action: Mapped[IngestionAction] = mapped_column(
        Enum(IngestionAction), nullable=False
    )
    stage: Mapped[str] = mapped_column(String(80), nullable=False)
    details: Mapped[dict | None] = mapped_column(JSON)
    error_message: Mapped[str | None] = mapped_column(Text)
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    document: Mapped[KnowledgeDocument] = relationship(back_populates="audit_logs")


class ProcessingJob(Base, TimestampMixin):
    """
    Job queue entry for asynchronous document processing.
    Supports priority, retry, and worker tracking.
    """

    __tablename__ = "processing_jobs"
    __table_args__ = (
        Index("ix_pj_status_priority", "status", "priority"),
        Index("ix_pj_doc", "document_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_documents.id"), nullable=False
    )
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus), default=JobStatus.pending, nullable=False
    )
    current_stage: Mapped[str | None] = mapped_column(String(80))
    progress_pct: Mapped[float] = mapped_column(
        Float, default=0.0, nullable=False
    )
    worker_id: Mapped[str | None] = mapped_column(String(80))
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_retries: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    error_message: Mapped[str | None] = mapped_column(Text)
    result_summary: Mapped[dict | None] = mapped_column(JSON)

    document: Mapped[KnowledgeDocument] = relationship(
        back_populates="processing_jobs"
    )


# ── Knowledge Table / Image / Version (Phase 3) ──────────────────────────


class KnowledgeTable(Base, TimestampMixin):
    """Dedicated storage for extracted tables as first-class knowledge assets."""

    __tablename__ = "knowledge_tables"
    __table_args__ = (
        UniqueConstraint("table_hash", "document_id", name="uq_table_doc"),
        Index("ix_kt_doc", "document_id"),
        Index("ix_kt_page", "document_id", "page_number"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_documents.id"), nullable=False
    )
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    table_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    table_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    table_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    table_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    table_text: Mapped[str] = mapped_column(Text, nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    col_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    extraction_method: Mapped[str] = mapped_column(
        String(20), default="pdfplumber", nullable=False
    )
    caption: Mapped[str | None] = mapped_column(String(500))
    chunk_id: Mapped[int | None] = mapped_column(
        ForeignKey("knowledge_chunks.id")
    )

    document: Mapped[KnowledgeDocument] = relationship()


class KnowledgeImage(Base, TimestampMixin):
    """Dedicated storage for extracted & understood images."""

    __tablename__ = "knowledge_images"
    __table_args__ = (
        UniqueConstraint("image_hash", "document_id", name="uq_image_doc"),
        Index("ix_ki_doc", "document_id"),
        Index("ix_ki_page", "document_id", "page_number"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_documents.id"), nullable=False
    )
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    image_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    image_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    image_path: Mapped[str] = mapped_column(String(700), nullable=False)
    width: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    height: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    content_type: Mapped[VisionContentType] = mapped_column(
        Enum(VisionContentType), default=VisionContentType.generic, nullable=False
    )
    caption: Mapped[str] = mapped_column(Text, nullable=False, default="")
    detected_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    vision_context: Mapped[str] = mapped_column(Text, nullable=False, default="")
    concepts: Mapped[list | None] = mapped_column(JSON)
    objects_detected: Mapped[list | None] = mapped_column(JSON)
    chunk_id: Mapped[int | None] = mapped_column(
        ForeignKey("knowledge_chunks.id")
    )

    document: Mapped[KnowledgeDocument] = relationship()


class DocumentVersion(Base, TimestampMixin):
    """
    Tracks every upload of the same logical document.
    Latest version is active; older versions preserved for rollback.
    """

    __tablename__ = "document_versions"
    __table_args__ = (
        Index("ix_dv_doc", "document_id"),
        Index("ix_dv_version", "document_id", "version_number"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_documents.id"), nullable=False
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    file_path: Mapped[str] = mapped_column(String(700), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    change_reason: Mapped[str | None] = mapped_column(String(500))
    uploaded_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), index=True
    )
    metadata_snapshot: Mapped[dict | None] = mapped_column(JSON)

    document: Mapped[KnowledgeDocument] = relationship()
