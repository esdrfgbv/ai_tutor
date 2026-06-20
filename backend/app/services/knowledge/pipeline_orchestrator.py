"""
Pipeline Orchestrator
======================
Orchestrates the full document processing pipeline:

  validate -> extract_content -> parse_layout -> extract_tables -> extract_images
  -> chunk -> deduplicate -> embed -> store

Each stage updates both ProcessingJob (async tracking) and KnowledgeDocument.
Supports retry with exponential backoff, dead-letter queue, and progress tracking.
"""

from __future__ import annotations

import hashlib
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.enums import (
    ChunkType,
    DocumentType,
    IngestionAction,
    JobStatus,
    ProcessingStatus,
    SourceType,
)
from app.models.knowledge_models import (
    IngestionAuditLog,
    KnowledgeChunk,
    KnowledgeDocument,
    KnowledgeEmbedding,
    ProcessingJob,
)
from app.services.knowledge.deduplication_service import deduplication_service
from app.services.knowledge.image_processor import image_processor
from app.services.knowledge.layout_parser import layout_parser
from app.services.knowledge.ocr_service import ocr_service
from app.services.knowledge.smart_chunker import smart_chunker
from app.services.knowledge.table_extractor import table_extractor
from app.services.vector_service import vector_service

logger = logging.getLogger(__name__)

# Stages in pipeline order (for progress calculation)
_STAGES = [
    "validating",
    "extracting",
    "parsing_layout",
    "extracting_tables",
    "extracting_images",
    "chunking",
    "deduplicating",
    "embedding",
    "extracting_questions",
]


class PipelineOrchestrator:
    """Orchestrates the end-to-end document processing pipeline."""

    def __init__(self):
        self.settings = get_settings()

    # ── Public Entry Points ────────────────────────────────────────────────

    def process_document(self, document_id: int) -> dict:
        """
        Process a single document through the full pipeline.
        Automatically retries with exponential backoff on failure.
        """
        db = SessionLocal()
        try:
            doc = db.get(KnowledgeDocument, document_id)
            if not doc:
                return {"status": "error", "error": f"Document {document_id} not found"}
            if doc.is_deleted:
                return {"status": "skipped", "reason": "Document is deleted"}

            job = self._get_or_create_job(db, doc)
            job.status = JobStatus.processing
            job.started_at = datetime.utcnow()
            job.attempt_count = (job.attempt_count or 0) + 1
            job.current_stage = "starting"
            job.progress_pct = 0.0
            job.error_message = None
            db.commit()

            doc.processing_status = ProcessingStatus.extracting
            doc.processing_started_at = datetime.utcnow()
            doc.processing_error = None
            db.commit()

            return self._run_pipeline(db, doc, job)

        except Exception as e:
            logger.error("Pipeline failed for doc %d: %s", document_id, e, exc_info=True)
            return self._handle_failure(db, document_id, e)

        finally:
            db.close()

    def reprocess_document(self, document_id: int) -> dict:
        """Reprocess a document (idempotent — clears and rebuilds)."""
        db = SessionLocal()
        try:
            doc = db.get(KnowledgeDocument, document_id)
            if not doc:
                return {"status": "error", "error": "Document not found"}

            vector_service.delete_vectors(
                where={"document_id": document_id},
            )

            # Delete embeddings first, then chunks (FK constraint)
            from app.models.knowledge_models import KnowledgeEmbedding
            db.query(KnowledgeEmbedding).filter(
                KnowledgeEmbedding.chunk_id.in_(
                    db.query(KnowledgeChunk.id).filter(
                        KnowledgeChunk.document_id == document_id,
                    )
                )
            ).delete(synchronize_session=False)
            db.query(KnowledgeChunk).filter(
                KnowledgeChunk.document_id == document_id,
            ).delete()
            # Clean up old QuestionBank records (FK cascade handled manually)
            from app.models.models import QuestionOption, QuestionBank, QuestionBankSource
            src = db.query(QuestionBankSource).filter(
                QuestionBankSource.file_path == doc.file_path,
            ).first()
            if src:
                old_qs = db.query(QuestionBank).filter(
                    QuestionBank.source_id == src.id,
                ).all()
                for old_q in old_qs:
                    db.query(QuestionOption).filter(
                        QuestionOption.question_id == old_q.id,
                    ).delete()
                    db.delete(old_q)
                db.delete(src)
            db.commit()

            job = self._get_or_create_job(db, doc)
            job.status = JobStatus.pending
            job.attempt_count = 0
            job.current_stage = "reprocessing"
            job.progress_pct = 0.0
            job.error_message = None
            db.commit()

            doc.processing_status = ProcessingStatus.queued
            doc.processing_error = None
            self._audit(db, doc.id, IngestionAction.retried, "reprocess")
            db.commit()
        finally:
            db.close()

        return self.process_document(document_id)

    # ── Pipeline Stages ────────────────────────────────────────────────────

    def _run_pipeline(
        self, db: Session, doc: KnowledgeDocument, job: ProcessingJob,
    ) -> dict:
        """Execute all pipeline stages in sequence."""
        file_path = Path(doc.file_path)
        result: dict = {
            "document_id": doc.id,
            "file_name": doc.original_file_name,
            "stages": {},
        }

        # ── Stage 1: Validate ─────────────────────────────────────────────
        self._update_stage(db, doc, job, "validating", 5)
        start = time.time()

        if not file_path.exists():
            self._audit(db, doc.id, IngestionAction.failed, "validate",
                        error="File not found")
            return self._fail(db, doc, job, "File not found", result)

        self._audit(db, doc.id, IngestionAction.validated, "validate",
                    duration_ms=self._elapsed(start))
        db.commit()

        # ── Stage 2: Extract text ─────────────────────────────────────────
        self._update_stage(db, doc, job, "extracting", 20)
        start = time.time()

        extraction = ocr_service.extract(file_path, doc.document_type)

        if extraction.errors:
            logger.warning("Extraction warnings for doc %d: %s",
                           doc.id, extraction.errors)

        if not extraction.pages:
            return self._fail(db, doc, job, "No text could be extracted", result,
                              details={"errors": extraction.errors})

        doc.total_pages = extraction.total_pages
        result["stages"]["extract"] = {
            "total_pages": extraction.total_pages,
            "ocr_pages": extraction.ocr_pages,
            "method": extraction.extraction_method,
        }
        self._audit(db, doc.id, IngestionAction.text_extracted, "extract",
                    details=result["stages"]["extract"],
                    duration_ms=self._elapsed(start))
        db.commit()

        # ── Stage 3: Parse layout ─────────────────────────────────────────
        self._update_stage(db, doc, job, "parsing_layout", 35)
        start = time.time()

        pages_for_layout = [
            {"page_number": p.page_number, "text": p.text}
            for p in extraction.pages
        ]
        layout = (
            layout_parser.parse_pdf(str(file_path), pages_for_layout)
            if doc.document_type == DocumentType.pdf
            else layout_parser.parse_text_pages(pages_for_layout)
        )

        result["stages"]["layout"] = {
            "elements": len(layout.elements),
            "has_tables": layout.has_tables,
            "has_images": layout.has_images,
            "has_questions": layout.has_questions,
        }
        self._audit(db, doc.id, IngestionAction.layout_parsed, "layout",
                    details=result["stages"]["layout"],
                    duration_ms=self._elapsed(start))
        db.commit()

        # ── Stage 4: Extract tables ───────────────────────────────────────
        self._update_stage(db, doc, job, "extracting_tables", 50)
        start = time.time()

        tables = []
        if doc.document_type == DocumentType.pdf:
            tables = table_extractor.extract_tables(file_path)

        result["stages"]["tables"] = {"count": len(tables)}
        self._audit(db, doc.id, IngestionAction.tables_extracted, "tables",
                    details={"table_count": len(tables)},
                    duration_ms=self._elapsed(start))

        from app.models.knowledge_models import KnowledgeTable
        table_records: list[KnowledgeTable] = []
        for tbl in tables:
            existing_tbl = (
                db.query(KnowledgeTable)
                .filter(
                    KnowledgeTable.document_id == doc.id,
                    KnowledgeTable.table_hash == tbl.to_json().get("hash", ""),
                )
                .first()
            )
            if existing_tbl:
                table_records.append(existing_tbl)
                continue
            hash_str = hashlib.sha256(tbl.to_searchable_text().encode()).hexdigest()
            kt = KnowledgeTable(
                document_id=doc.id,
                page_number=tbl.page_number,
                table_index=tbl.table_index,
                table_hash=hash_str,
                table_json=tbl.to_json(),
                table_markdown=tbl.to_searchable_text(),
                table_text=tbl.to_searchable_text(),
                row_count=len(tbl.rows),
                col_count=len(tbl.headers),
                extraction_method="pdfplumber",
                caption=tbl.table_title,
            )
            db.add(kt)
            table_records.append(kt)
        db.flush()

        # ── Stage 5: Extract images ───────────────────────────────────────
        self._update_stage(db, doc, job, "extracting_images", 65)
        start = time.time()

        images = []
        if doc.document_type == DocumentType.pdf:
            try:
                images = image_processor.extract_and_describe(
                    file_path, doc.id, use_vision_model=False,
                )
            except Exception as e:
                logger.warning("Image extraction failed for doc %d: %s", doc.id, e)

        result["stages"]["images"] = {"count": len(images)}
        self._audit(db, doc.id, IngestionAction.images_extracted, "images",
                    details={"image_count": len(images)},
                    duration_ms=self._elapsed(start))

        from app.models.knowledge_models import KnowledgeImage
        image_records: list[KnowledgeImage] = []
        for img in images:
            hash_str = hashlib.sha256(
                (img.image_path or f"doc{doc.id}-p{img.page_number}-i{img.image_index}").encode()
            ).hexdigest()
            existing_img = (
                db.query(KnowledgeImage)
                .filter(
                    KnowledgeImage.document_id == doc.id,
                    KnowledgeImage.image_hash == hash_str,
                )
                .first()
            )
            if existing_img:
                image_records.append(existing_img)
                continue
            ki = KnowledgeImage(
                document_id=doc.id,
                page_number=img.page_number,
                image_index=img.image_index if hasattr(img, 'image_index') else 0,
                image_hash=hash_str,
                image_path=img.image_path or "",
                width=img.width if hasattr(img, 'width') else 0,
                height=img.height if hasattr(img, 'height') else 0,
                content_type=img.image_type if hasattr(img, 'image_type') else "generic",
                caption=img.description or "",
                detected_text="",
                vision_context=img.description or "",
                concepts=None,
                objects_detected=(
                    img.detected_elements if hasattr(img, 'detected_elements') else None
                ),
            )
            db.add(ki)
            image_records.append(ki)
        db.flush()
        db.commit()

        # ── Stage 6: Chunk ────────────────────────────────────────────────
        self._update_stage(db, doc, job, "chunking", 75)
        start = time.time()

        chunks = smart_chunker.chunk_elements(layout.elements)

        for tbl in tables:
            from app.services.knowledge.smart_chunker import Chunk
            table_chunk = Chunk(
                text=tbl.to_searchable_text(),
                chunk_type="table",
                page_number=tbl.page_number,
                structured_data=tbl.to_json(),
            )
            table_chunk.compute_hash()
            chunks.append(table_chunk)

        for img in images:
            if img.description:
                from app.services.knowledge.smart_chunker import Chunk
                img_chunk = Chunk(
                    text=f"[Image on page {img.page_number}] {img.description}",
                    chunk_type="image_context",
                    page_number=img.page_number,
                    structured_data={
                        "image_path": img.image_path,
                        "image_type": img.image_type,
                        "description": img.description,
                        "detected_elements": img.detected_elements,
                        "width": img.width,
                        "height": img.height,
                    },
                )
                img_chunk.compute_hash()
                chunks.append(img_chunk)

        result["stages"]["chunking"] = {"total_chunks": len(chunks)}
        self._audit(db, doc.id, IngestionAction.chunked, "chunking",
                    details={"chunk_count": len(chunks)},
                    duration_ms=self._elapsed(start))
        db.commit()

        # ── Stage 7a: Clean up old chunks / tables from previous runs ──
        # Must happen before deduplication so in-doc duplicates don't match old rows.
        db.query(KnowledgeEmbedding).filter(
            KnowledgeEmbedding.chunk_id.in_(
                db.query(KnowledgeChunk.id).filter(
                    KnowledgeChunk.document_id == doc.id,
                )
            )
        ).delete(synchronize_session=False)
        db.query(KnowledgeChunk).filter(
            KnowledgeChunk.document_id == doc.id,
        ).delete()
        db.query(KnowledgeTable).filter(
            KnowledgeTable.document_id == doc.id,
        ).delete()
        db.flush()

        # ── Stage 7b: Deduplicate ─────────────────────────────────────────
        self._update_stage(db, doc, job, "deduplicating", 85)
        start = time.time()

        full_text = " ".join(c.text for c in chunks if c.text)
        doc.content_fingerprint = deduplication_service.compute_content_fingerprint(full_text)

        near_dup = deduplication_service.check_content_duplicate(
            db, doc.content_fingerprint, exclude_id=doc.id,
        )
        if near_dup:
            logger.info(
                "Near-duplicate detected: doc %d is similar to doc %d",
                doc.id, near_dup.id,
            )

        chunk_dicts = [
            {"text": c.text, "chunk_hash": c.chunk_hash, "chunk": c}
            for c in chunks
        ]
        unique_chunk_dicts = deduplication_service.deduplicate_chunks(
            chunk_dicts, doc.id, db,
        )
        unique_chunks = [cd["chunk"] for cd in unique_chunk_dicts]

        result["stages"]["dedup"] = {
            "original": len(chunks),
            "after_dedup": len(unique_chunks),
            "removed": len(chunks) - len(unique_chunks),
            "near_duplicate_doc_id": near_dup.id if near_dup else None,
        }
        self._audit(db, doc.id, IngestionAction.deduplicated, "dedup",
                    details=result["stages"]["dedup"],
                    duration_ms=self._elapsed(start))
        db.commit()

        # ── Stage 8: Embed & store ────────────────────────────────────────
        self._update_stage(db, doc, job, "embedding", 95)
        start = time.time()

        vector_ids: list[str] = []
        vector_texts: list[str] = []
        vector_metas: list[dict] = []
        chunk_records: list[KnowledgeChunk] = []

        chunk_type_map = {
            "text": ChunkType.text,
            "table": ChunkType.table,
            "image_context": ChunkType.image_context,
            "heading": ChunkType.heading,
            "question_block": ChunkType.question_block,
            "equation": ChunkType.equation,
        }

        for idx, chunk in enumerate(unique_chunks):
            chunk_record = KnowledgeChunk(
                document_id=doc.id,
                chunk_hash=chunk.chunk_hash,
                chunk_text=chunk.text[:10000],
                chunk_type=chunk_type_map.get(chunk.chunk_type, ChunkType.text),
                page_number=chunk.page_number,
                chunk_index=idx,
                structured_data=chunk.structured_data,
                doc_class=doc.doc_class,
                doc_subject=doc.doc_subject,
                doc_chapter=doc.doc_chapter,
                source_type=doc.source_type,
            )
            db.add(chunk_record)
            db.flush()

            vector_id = f"kb-{doc.id}-c{idx}"
            vector_meta: dict = {
                "document_id": doc.id,
                "chunk_id": chunk_record.id,
                "chunk_type": chunk.chunk_type,
                "page_number": chunk.page_number or 0,
            }
            if doc.doc_class:
                vector_meta["class"] = doc.doc_class
            if doc.doc_subject:
                vector_meta["subject"] = doc.doc_subject
            if doc.doc_chapter:
                vector_meta["chapter"] = doc.doc_chapter
            if doc.source_type:
                vector_meta["source_type"] = doc.source_type.value
            if doc.exam_type:
                vector_meta["exam_type"] = doc.exam_type
            if doc.year:
                vector_meta["year"] = doc.year

            vector_ids.append(vector_id)
            vector_texts.append(chunk.text[:5000])
            vector_metas.append(vector_meta)
            chunk_records.append(chunk_record)

        if vector_texts:
            try:
                vector_service.add_chunks(
                    vector_ids, vector_texts, vector_metas,
                    batch_size=100,
                )
            except Exception as e:
                logger.error("Vector store error for doc %d: %s", doc.id, e)

            for vid, chunk_record in zip(vector_ids, chunk_records):
                db.add(KnowledgeEmbedding(
                    chunk_id=chunk_record.id,
                    vector_id=vid,
                    collection_name=vector_service.KB_COLLECTION,
                ))

        doc.total_chunks = len(unique_chunks)
        doc.processing_completed_at = datetime.utcnow()
        doc.processing_error = None

        result["stages"]["embedding"] = {"chunks_embedded": len(vector_ids)}
        self._audit(db, doc.id, IngestionAction.embedded, "embed",
                    details=result["stages"]["embedding"],
                    duration_ms=self._elapsed(start))
        self._audit(db, doc.id, IngestionAction.completed, "pipeline",
                    details={
                        "total_pages": doc.total_pages,
                        "total_chunks": doc.total_chunks,
                    })

        # ── Stage 9: Extract questions for QuestionBank ────────────────────
        # Convert question_block KnowledgeChunks into QuestionBank records.
        job.current_stage = "extracting_questions"
        job.progress_pct = 98
        db.commit()
        start_q = time.time()

        q_blocks = [
            c for c in chunk_records
            if c.chunk_type == ChunkType.question_block
        ]
        q_count = 0
        if q_blocks:
            from app.models.models import QuestionBank, QuestionBankSource, QuestionOption
            from app.models.enums import Difficulty, QuestionType

            # Create or reuse QuestionBankSource; clean old questions on reprocess
            src = (
                db.query(QuestionBankSource)
                .filter(QuestionBankSource.file_path == doc.file_path)
                .first()
            )
            if src:
                # Delete old questions + options (FK cascade)
                old_qs = db.query(QuestionBank).filter(
                    QuestionBank.source_id == src.id,
                ).all()
                for old_q in old_qs:
                    db.query(QuestionOption).filter(
                        QuestionOption.question_id == old_q.id,
                    ).delete()
                    db.delete(old_q)
                db.flush()
                src.extraction_status = None
                src.total_questions_extracted = 0
            else:
                src = QuestionBankSource(
                    file_path=doc.file_path,
                    file_name=doc.file_name,
                    display_name=doc.original_file_name,
                    exam_type=doc.exam_type,
                    year=doc.year,
                    grade=int(doc.doc_class) if doc.doc_class else None,
                )
                db.add(src)
                db.flush()

            for chunk in q_blocks:
                text = (chunk.chunk_text or "").strip()
                if not text or len(text) < 10:
                    continue
                qb = QuestionBank(
                    source_id=src.id,
                    source_pdf=doc.original_file_name or "",
                    source_page=chunk.page_number,
                    prompt=text[:2000],
                    correct_answer="",
                    subject=doc.doc_subject,
                    grade=int(doc.doc_class) if doc.doc_class else None,
                    chapter=doc.doc_chapter,
                    year=doc.year,
                    difficulty=Difficulty.medium,
                    question_type=QuestionType.reasoning,
                    marks=1,
                )
                db.add(qb)
                q_count += 1

            src.total_questions_extracted = q_count
            db.flush()
            result["stages"]["questions"] = {
                "status": "extracted", "question_blocks": len(q_blocks),
                "questions_created": q_count,
            }
        else:
            result["stages"]["questions"] = {
                "status": "skipped", "reason": "no question_block chunks found",
            }

        doc.total_questions = q_count
        self._audit(db, doc.id, IngestionAction.completed, "questions",
                    details=result["stages"].get("questions", {}),
                    duration_ms=self._elapsed(start_q))
        db.commit()

        # Mark document and job complete
        doc.processing_status = ProcessingStatus.completed
        job.status = JobStatus.completed
        job.current_stage = "completed"
        job.progress_pct = 100.0
        job.completed_at = datetime.utcnow()
        job.result_summary = result
        db.commit()

        result["status"] = "completed"
        result["total_pages"] = doc.total_pages
        result["total_chunks"] = doc.total_chunks

        logger.info(
            "Pipeline completed for doc %d: %d pages, %d chunks",
            doc.id, doc.total_pages, doc.total_chunks,
        )
        return result

    # ── Failure & Retry ────────────────────────────────────────────────────

    def _handle_failure(
        self, db: Session, document_id: int, exc: Exception,
    ) -> dict:
        """Handle failure with retry/backoff and dead-letter logic."""
        try:
            doc = db.get(KnowledgeDocument, document_id)
            if not doc:
                return {"status": "error", "error": str(exc)}

            job = (
                db.query(ProcessingJob)
                .filter(ProcessingJob.document_id == document_id)
                .order_by(ProcessingJob.id.desc())
                .first()
            )
            if not job:
                job = self._get_or_create_job(db, doc)

            job.attempt_count = (job.attempt_count or 0) + 1
            job.error_message = str(exc)[:2000]

            doc.processing_status = ProcessingStatus.failed
            doc.processing_error = str(exc)[:2000]

            MAX_RETRIES = getattr(self.settings, "max_processing_retries", 3)
            max_allowed = job.max_retries or MAX_RETRIES

            if job.attempt_count >= max_allowed:
                job.status = JobStatus.dead_letter
                job.current_stage = "dead_letter"
                doc.retry_count = job.attempt_count
                self._audit(db, document_id, IngestionAction.failed, "pipeline",
                            error=str(exc),
                            details={"attempt": job.attempt_count, "dead_letter": True})
            else:
                job.status = JobStatus.retrying
                backoff = self._compute_backoff(job.attempt_count)
                job.current_stage = f"retrying_in_{backoff}s"
                doc.retry_count = job.attempt_count
                self._audit(db, document_id, IngestionAction.retried, "pipeline",
                            error=str(exc),
                            details={
                                "attempt": job.attempt_count,
                                "backoff_seconds": backoff,
                                "max_retries": max_allowed,
                            })

            db.commit()

            # Blocking retry with exponential backoff
            if job.attempt_count < max_allowed:
                backoff = self._compute_backoff(job.attempt_count)
                logger.info(
                    "Retrying doc %d in %ds (attempt %d/%d)",
                    document_id, backoff, job.attempt_count, max_allowed,
                )
                time.sleep(backoff)
                db.close()
                return self.process_document(document_id)

            return {
                "status": "dead_letter",
                "error": str(exc)[:500],
                "attempts": job.attempt_count,
            }

        except Exception as inner:
            logger.error("Failure handler error for doc %d: %s", document_id, inner)
            try:
                doc = db.get(KnowledgeDocument, document_id)
                if doc:
                    doc.processing_error = str(inner)[:2000]
                    doc.retry_count = (doc.retry_count or 0) + 1
                db.commit()
            except Exception:
                db.rollback()
            return {"status": "failed", "error": str(exc)[:500]}

    @staticmethod
    def _compute_backoff(attempt: int) -> int:
        """Exponential backoff: 2^(attempt-1) * 10 seconds, capped at 1 hour."""
        return min(10 * (2 ** (attempt - 1)), 3600)

    # ── Helpers ────────────────────────────────────────────────────────────

    def _get_or_create_job(
        self, db: Session, doc: KnowledgeDocument,
    ) -> ProcessingJob:
        """Get the most recent ProcessingJob or create one."""
        job = (
            db.query(ProcessingJob)
            .filter(ProcessingJob.document_id == doc.id)
            .order_by(ProcessingJob.id.desc())
            .first()
        )
        if job:
            return job
        job = ProcessingJob(
            document_id=doc.id,
            priority=0,
            status=JobStatus.pending,
            max_retries=getattr(self.settings, "max_processing_retries", 3),
        )
        db.add(job)
        db.flush()
        return job

    def _update_stage(
        self,
        db: Session,
        doc: KnowledgeDocument,
        job: ProcessingJob,
        stage: str,
        progress_pct: float,
    ) -> None:
        """Update progress tracking on both document and job."""
        stage_attr = getattr(ProcessingStatus, stage, None)
        if stage_attr is not None:
            doc.processing_status = stage_attr
        job.current_stage = stage
        job.progress_pct = progress_pct
        db.commit()

    @staticmethod
    def _fail(
        db: Session,
        doc: KnowledgeDocument,
        job: ProcessingJob,
        error: str,
        result: dict,
        details: dict | None = None,
    ) -> dict:
        """Mark document and job as failed."""
        doc.processing_status = ProcessingStatus.failed
        doc.processing_error = error[:2000]
        job.status = JobStatus.failed
        job.current_stage = "failed"
        job.error_message = error[:2000]
        db.commit()
        result["status"] = "failed"
        result["error"] = error
        return result

    def _audit(
        self,
        db: Session,
        document_id: int,
        action: IngestionAction,
        stage: str,
        *,
        details: dict | None = None,
        error: str | None = None,
        duration_ms: int | None = None,
    ) -> None:
        db.add(IngestionAuditLog(
            document_id=document_id,
            action=action,
            stage=stage,
            details=details,
            error_message=error,
            duration_ms=duration_ms,
            timestamp=datetime.utcnow(),
        ))

    @staticmethod
    def _elapsed(start: float) -> int:
        return int((time.time() - start) * 1000)


pipeline_orchestrator = PipelineOrchestrator()
