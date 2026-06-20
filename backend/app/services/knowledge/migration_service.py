"""
Migration Service
==================
Migrates legacy `pdf_metadata` and `embedding_metadata` into the new Knowledge Base
schema (`KnowledgeDocument`, `KnowledgeChunk`, etc.).
"""

import logging
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session

from app.models.models import PdfMetadata, EmbeddingMetadata
from app.models.knowledge_models import KnowledgeDocument, KnowledgeChunk, KnowledgeEmbedding
from app.models.enums import DocumentType, ProcessingStatus, ChunkType
from app.services.vector_service import vector_service
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class MigrationService:
    def migrate_legacy_data(self, db: Session) -> dict:
        """
        Migrates all legacy PDF and Embedding metadata into the new schema.
        Idempotent operation (skips already migrated files).
        """
        settings = get_settings()
        legacy_docs = db.query(PdfMetadata).all()
        migrated_docs = 0
        migrated_chunks = 0
        errors = []

        for ldoc in legacy_docs:
            try:
                # Check if already migrated
                existing = db.query(KnowledgeDocument).filter(
                    KnowledgeDocument.original_file_name == ldoc.filename
                ).first()
                if existing:
                    continue

                # Create KnowledgeDocument
                doc = KnowledgeDocument(
                    file_name=ldoc.filename,
                    original_file_name=ldoc.filename,
                    file_path=str(Path(settings.upload_dir) / ldoc.filename) if getattr(ldoc, 'file_path', None) is None else getattr(ldoc, 'file_path', ''),
                    file_hash=f"legacy-{ldoc.id}",
                    file_size=0,
                    document_type=DocumentType.pdf,
                    source_type="textbook",
                    doc_class=str(ldoc.grade) if ldoc.grade else None,
                    doc_subject=ldoc.subject,
                    doc_chapter=ldoc.chapter,
                    processing_status=ProcessingStatus.completed,
                    processing_completed_at=datetime.utcnow()
                )
                db.add(doc)
                db.flush()

                # Migrate chunks
                legacy_chunks = db.query(EmbeddingMetadata).filter(
                    EmbeddingMetadata.pdf_id == ldoc.id
                ).all()

                doc_chunk_count = 0
                for idx, lchunk in enumerate(legacy_chunks):
                    # Fetch chunk text from chroma if needed, or assume we just migrate metadata and keep vectors
                    # To be safe, we add a placeholder text if we can't get it
                    chunk_text = lchunk.chunk_text if hasattr(lchunk, 'chunk_text') and lchunk.chunk_text else f"Legacy chunk {lchunk.vector_id}"
                    
                    kc = KnowledgeChunk(
                        document_id=doc.id,
                        chunk_hash=f"legacy-chunk-{lchunk.id}",
                        chunk_text=chunk_text[:10000],
                        chunk_type=ChunkType.text,
                        page_number=lchunk.page_number,
                        chunk_index=idx,
                        doc_class=doc.doc_class,
                        doc_subject=doc.doc_subject,
                        doc_chapter=doc.doc_chapter
                    )
                    db.add(kc)
                    db.flush()

                    ke = KnowledgeEmbedding(
                        chunk_id=kc.id,
                        vector_id=lchunk.vector_id,
                        collection_name="knowledge_base"
                    )
                    db.add(ke)
                    doc_chunk_count += 1
                
                doc.total_chunks = doc_chunk_count
                migrated_docs += 1
                migrated_chunks += doc_chunk_count
                
                db.commit()

            except Exception as e:
                db.rollback()
                logger.error(f"Failed to migrate doc {ldoc.id}: {e}")
                errors.append(f"Doc {ldoc.id}: {str(e)}")

        return {
            "migrated_docs": migrated_docs,
            "migrated_chunks": migrated_chunks,
            "errors": errors
        }

migration_service = MigrationService()
