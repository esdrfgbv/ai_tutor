"""
Knowledge Base Admin API Routes
=================================
Full CRUD for the Knowledge Base Management Portal.
Handles upload, document management, metadata registry, processing queue,
analytics, tables, images, versions, and search.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import JobStatus, ProcessingStatus, Role
from app.models.knowledge_models import (
    CanonicalQuestion,
    DocumentVersion,
    IngestionAuditLog,
    KnowledgeChunk,
    KnowledgeDocument,
    KnowledgeEmbedding,
    KnowledgeImage,
    KnowledgeTable,
    MetadataRegistry,
    ProcessingJob,
    QuestionSourceLink,
)
from app.models.models import User
from app.schemas.knowledge_schemas import (
    AuditLogOut,
    DocumentVersionOut,
    KnowledgeAnalyticsOut,
    KnowledgeChunkOut,
    KnowledgeDocumentDetailOut,
    KnowledgeDocumentListOut,
    KnowledgeDocumentOut,
    KnowledgeImageOut,
    KnowledgeTableOut,
    MetadataValueIn,
    MetadataValueOut,
    MetadataValueUpdateIn,
    ProcessingJobOut,
)
from app.services.knowledge.metadata_service import metadata_service
from app.services.knowledge.upload_service import upload_service
from app.services.knowledge.migration_service import migration_service
from app.services.vector_service import vector_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/knowledge", tags=["admin", "knowledge_base"])


# ── Upload & Document Management ─────────────────────────────────────────


@router.post("/upload", response_model=KnowledgeDocumentOut)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    metadata_json: str = Form("{}"),
    user: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Upload a document with metadata and queue it for processing."""
    try:
        metadata = json.loads(metadata_json)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid metadata JSON")

    doc, error = await upload_service.upload_and_register(
        db, file, metadata=metadata, uploaded_by_id=user.id
    )

    if error:
        raise HTTPException(400, error)

    from app.services.knowledge.pipeline_orchestrator import pipeline_orchestrator
    background_tasks.add_task(pipeline_orchestrator.process_document, doc.id)

    return doc


@router.get("/documents", response_model=KnowledgeDocumentListOut)
def list_documents(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    status: str | None = None,
    source_type: str | None = None,
    doc_class: str | None = None,
    subject: str | None = None,
    exam_type: str | None = None,
    search: str | None = None,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    query = db.query(KnowledgeDocument).filter(
        KnowledgeDocument.is_deleted.is_(False)
    )

    if status:
        query = query.filter(KnowledgeDocument.processing_status == status)
    if source_type:
        query = query.filter(KnowledgeDocument.source_type == source_type)
    if doc_class:
        query = query.filter(KnowledgeDocument.doc_class == doc_class)
    if subject:
        query = query.filter(KnowledgeDocument.doc_subject == subject)
    if exam_type:
        query = query.filter(KnowledgeDocument.exam_type == exam_type)
    if search:
        query = query.filter(
            KnowledgeDocument.original_file_name.ilike(f"%{search}%")
        )

    total = query.count()
    docs = (
        query.order_by(KnowledgeDocument.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return KnowledgeDocumentListOut(
        total_count=total,
        page=page,
        limit=limit,
        data=[_doc_to_out(d) for d in docs],
    )


@router.get("/documents/{doc_id}", response_model=KnowledgeDocumentDetailOut)
def get_document(
    doc_id: int,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    doc = db.get(KnowledgeDocument, doc_id)
    if not doc or doc.is_deleted:
        raise HTTPException(404, "Document not found")

    logs = (
        db.query(IngestionAuditLog)
        .filter(IngestionAuditLog.document_id == doc_id)
        .order_by(IngestionAuditLog.timestamp.asc())
        .all()
    )

    chunk_counts = dict(
        db.query(KnowledgeChunk.chunk_type, func.count(KnowledgeChunk.id))
        .filter(KnowledgeChunk.document_id == doc_id)
        .group_by(KnowledgeChunk.chunk_type)
        .all()
    )

    table_count = db.query(KnowledgeTable).filter(
        KnowledgeTable.document_id == doc_id
    ).count()

    image_count = db.query(KnowledgeImage).filter(
        KnowledgeImage.document_id == doc_id
    ).count()

    out = _doc_to_detail_out(doc)
    out.audit_logs = [
        AuditLogOut(
            id=log.id,
            action=log.action.value if hasattr(log.action, 'value') else str(log.action),
            stage=log.stage,
            details=log.details,
            error_message=log.error_message,
            duration_ms=log.duration_ms,
            timestamp=log.timestamp,
        )
        for log in logs
    ]
    out.chunk_count_by_type = {
        (k.value if hasattr(k, 'value') else str(k)): v
        for k, v in chunk_counts.items()
    }
    out.table_count = table_count
    out.image_count = image_count

    return out


@router.put("/documents/{doc_id}/metadata")
def update_document_metadata(
    doc_id: int,
    metadata: dict,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Update document metadata fields."""
    doc = db.get(KnowledgeDocument, doc_id)
    if not doc or doc.is_deleted:
        raise HTTPException(404, "Document not found")

    if "class" in metadata:
        doc.doc_class = str(metadata["class"])
    if "subject" in metadata:
        doc.doc_subject = metadata["subject"]
    if "chapter" in metadata:
        doc.doc_chapter = metadata["chapter"]
    if "exam_type" in metadata:
        doc.exam_type = metadata["exam_type"]
    if "source_type" in metadata:
        doc.source_type = metadata["source_type"]
    if "year" in metadata:
        doc.year = int(metadata["year"])
    if "language" in metadata:
        doc.language = metadata["language"]
    if "tags" in metadata:
        doc.tags = metadata["tags"]

    db.commit()
    return _doc_to_out(doc)


@router.delete("/documents/{doc_id}")
def delete_document(
    doc_id: int,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Soft-delete a document and its vectors."""
    doc = db.get(KnowledgeDocument, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    doc.is_deleted = True
    db.commit()

    vector_service.delete_vectors(where={"document_id": doc_id})
    return {"message": "Document deleted", "id": doc_id}


@router.post("/documents/{doc_id}/reprocess")
def reprocess_document(
    doc_id: int,
    background_tasks: BackgroundTasks,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    doc = db.get(KnowledgeDocument, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    doc.processing_status = ProcessingStatus.queued
    doc.processing_error = None
    db.commit()

    from app.services.knowledge.pipeline_orchestrator import pipeline_orchestrator
    background_tasks.add_task(pipeline_orchestrator.reprocess_document, doc_id)

    return {"message": "Document queued for reprocessing", "id": doc_id}


@router.get("/documents/{doc_id}/chunks", response_model=list[KnowledgeChunkOut])
def get_document_chunks(
    doc_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    chunks = (
        db.query(KnowledgeChunk)
        .filter(KnowledgeChunk.document_id == doc_id)
        .order_by(KnowledgeChunk.chunk_index)
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return chunks


@router.get("/documents/{doc_id}/tables", response_model=list[KnowledgeTableOut])
def get_document_tables(
    doc_id: int,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Get extracted tables for a document."""
    return (
        db.query(KnowledgeTable)
        .filter(KnowledgeTable.document_id == doc_id)
        .order_by(KnowledgeTable.page_number, KnowledgeTable.table_index)
        .all()
    )


@router.get("/documents/{doc_id}/images", response_model=list[KnowledgeImageOut])
def get_document_images(
    doc_id: int,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Get extracted images for a document."""
    return (
        db.query(KnowledgeImage)
        .filter(KnowledgeImage.document_id == doc_id)
        .order_by(KnowledgeImage.page_number, KnowledgeImage.image_index)
        .all()
    )


@router.get("/documents/{doc_id}/versions", response_model=list[DocumentVersionOut])
def get_document_versions(
    doc_id: int,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Get version history for a document."""
    return (
        db.query(DocumentVersion)
        .filter(DocumentVersion.document_id == doc_id)
        .order_by(DocumentVersion.version_number.desc())
        .all()
    )


@router.post("/documents/{doc_id}/rollback/{version_id}")
def rollback_document(
    doc_id: int,
    version_id: int,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Rollback a document to a previous version."""
    doc = db.get(KnowledgeDocument, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    version = db.get(DocumentVersion, version_id)
    if not version or version.document_id != doc_id:
        raise HTTPException(404, "Version not found")

    # Deactivate all versions, then activate target
    db.query(DocumentVersion).filter(
        DocumentVersion.document_id == doc_id
    ).update({"is_active": False})

    version.is_active = True
    doc.file_path = version.file_path
    doc.file_hash = version.file_hash
    doc.file_size = version.file_size
    doc.processing_status = ProcessingStatus.queued
    db.commit()

    # Queue reprocessing
    from app.services.knowledge.pipeline_orchestrator import pipeline_orchestrator
    from app.db.session import SessionLocal
    job_db = SessionLocal()
    try:
        pipeline_orchestrator.reprocess_document(doc_id)
    finally:
        job_db.close()

    return {"message": f"Rolled back to version {version.version_number}", "id": doc_id}


# ── Processing Queue ─────────────────────────────────────────────────────


@router.get("/queue", response_model=list[ProcessingJobOut])
def get_processing_queue(
    status: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    query = db.query(ProcessingJob)
    if status:
        query = query.filter(ProcessingJob.status == status)

    jobs = (
        query.order_by(ProcessingJob.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return jobs


# ── Metadata Management ─────────────────────────────────────────────────


@router.get("/metadata/schema")
def get_metadata_schema(
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    return {"fields": metadata_service.get_schema(db)}


@router.get("/metadata/{field_name}", response_model=list[MetadataValueOut])
def get_metadata_values(
    field_name: str,
    parent_field: str | None = None,
    parent_value: str | None = None,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    values = metadata_service.get_field_values(
        db, field_name,
        parent_field=parent_field,
        parent_value=parent_value,
    )
    return values


@router.post("/metadata/{field_name}", response_model=MetadataValueOut)
def add_metadata_value(
    field_name: str,
    payload: MetadataValueIn,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    entry = metadata_service.add_field_value(
        db,
        field_name,
        payload.value,
        payload.label,
        parent_field=payload.parent_field,
        parent_value=payload.parent_value,
        sort_order=payload.sort_order,
    )
    db.commit()
    return {
        "id": entry.id,
        "value": entry.field_value,
        "label": entry.display_label,
        "parent_field": entry.parent_field,
        "parent_value": entry.parent_value,
    }


@router.put("/metadata/{field_name}/{entry_id}")
def update_metadata_value(
    field_name: str,
    entry_id: int,
    payload: MetadataValueUpdateIn,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    entry = metadata_service.update_field_value(
        db, entry_id,
        display_label=payload.label,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    if not entry:
        raise HTTPException(404, "Metadata entry not found")
    db.commit()
    return {"message": "Updated", "id": entry.id}


@router.delete("/metadata/{field_name}/{entry_id}")
def deactivate_metadata_value(
    field_name: str,
    entry_id: int,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    ok = metadata_service.deactivate_field_value(db, entry_id)
    if not ok:
        raise HTTPException(404, "Metadata entry not found")
    db.commit()
    return {"message": "Deactivated"}


# ── Analytics ────────────────────────────────────────────────────────────


@router.get("/analytics", response_model=KnowledgeAnalyticsOut)
def get_knowledge_analytics(
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    from app.services.knowledge.knowledge_analytics_service import knowledge_analytics_service
    data = knowledge_analytics_service.get_snapshot(db)
    return KnowledgeAnalyticsOut(**data)


@router.post("/migrate")
def trigger_migration(
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    results = migration_service.migrate_legacy_data(db)
    return results


# ── Search ───────────────────────────────────────────────────────────────


@router.get("/search")
def search_knowledge(
    query: str = Query(..., min_length=1),
    doc_class: str | None = None,
    subject: str | None = None,
    chapter: str | None = None,
    exam_type: str | None = None,
    limit: int = Query(10, ge=1, le=50),
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Search across all knowledge base content using vector_service."""
    filters = {}
    if doc_class:
        filters["class"] = doc_class
    if subject:
        filters["subject"] = subject
    if chapter:
        filters["chapter"] = chapter
    if exam_type:
        filters["exam_type"] = exam_type

    results = vector_service.query(
        query, n_results=limit, filters=filters if filters else None,
    )

    output = []
    for r in results:
        meta = r.get("metadata", {})
        doc_id = meta.get("document_id")
        doc_name = ""
        if doc_id:
            doc = db.get(KnowledgeDocument, doc_id)
            doc_name = doc.original_file_name if doc else ""

        output.append({
            "chunk_id": meta.get("chunk_id"),
            "document_id": doc_id,
            "chunk_text": (r.get("text") or "")[:500],
            "chunk_type": meta.get("chunk_type", "text"),
            "page_number": meta.get("page_number"),
            "score": round(1 - r.get("distance", 0), 4) if r.get("distance") else 0,
            "document_name": doc_name,
            "subject": meta.get("subject"),
            "chapter": meta.get("chapter"),
        })

    return {"results": output, "total": len(output)}


# ── Health ───────────────────────────────────────────────────────────────


@router.get("/health")
def knowledge_base_health(
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Health check for all KB subsystems."""
    try:
        db.query(KnowledgeDocument).first()
        db_ok = True
    except Exception:
        db_ok = False

    vector_health = vector_service.get_collection_stats()

    return {
        "database": "healthy" if db_ok else "unreachable",
        "vector_store": vector_health,
        "collections": vector_service.list_collections(),
    }


# ── Helpers ──────────────────────────────────────────────────────────────


def _doc_to_out(doc: KnowledgeDocument) -> KnowledgeDocumentOut:
    return KnowledgeDocumentOut(
        id=doc.id,
        file_name=doc.file_name,
        original_file_name=doc.original_file_name,
        file_size=doc.file_size,
        document_type=doc.document_type.value if hasattr(doc.document_type, 'value') else str(doc.document_type),
        source_type=doc.source_type.value if hasattr(doc.source_type, 'value') else str(doc.source_type),
        doc_class=doc.doc_class,
        doc_subject=doc.doc_subject,
        doc_chapter=doc.doc_chapter,
        exam_type=doc.exam_type,
        year=doc.year,
        language=doc.language,
        tags=doc.tags,
        processing_status=doc.processing_status.value if hasattr(doc.processing_status, 'value') else str(doc.processing_status),
        processing_error=doc.processing_error,
        retry_count=doc.retry_count,
        total_pages=doc.total_pages,
        total_chunks=doc.total_chunks,
        total_questions=doc.total_questions,
        processing_started_at=doc.processing_started_at,
        processing_completed_at=doc.processing_completed_at,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


def _doc_to_detail_out(doc: KnowledgeDocument) -> KnowledgeDocumentDetailOut:
    base = _doc_to_out(doc)
    return KnowledgeDocumentDetailOut(**base.model_dump())
