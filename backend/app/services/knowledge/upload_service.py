"""
Upload Service
===============
Handles file validation, hashing, storage, and initial record creation.
Supports PDF, DOCX, PNG, JPG, JPEG.
"""

from __future__ import annotations

import hashlib
import logging
import shutil
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.enums import DocumentType, JobStatus, ProcessingStatus, IngestionAction, SourceType
from app.models.knowledge_models import (
    DocumentVersion,
    IngestionAuditLog,
    KnowledgeDocument,
    ProcessingJob,
)

logger = logging.getLogger(__name__)

# Allowed MIME types / extensions
ALLOWED_EXTENSIONS: dict[str, DocumentType] = {
    ".pdf": DocumentType.pdf,
    ".docx": DocumentType.docx,
    ".png": DocumentType.image,
    ".jpg": DocumentType.image,
    ".jpeg": DocumentType.image,
    ".txt": DocumentType.txt,
}

class UploadService:
    """Validates, stores, and registers uploaded files."""

    def __init__(self):
        self.settings = get_settings()

    @property
    def max_file_size_mb(self) -> int:
        return getattr(self.settings, "max_upload_size_mb", 100)

    def validate_file(self, filename: str, file_size: int) -> tuple[bool, str]:
        """Validate file type and size."""
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            allowed = ", ".join(ALLOWED_EXTENSIONS.keys())
            return False, f"Unsupported file type '{ext}'. Allowed: {allowed}"
        limit = self.max_file_size_mb
        if file_size > limit * 1024 * 1024:
            return False, f"File exceeds {limit}MB limit"
        return True, ""

    def compute_file_hash(self, file_path: Path) -> str:
        """Compute SHA256 hash of a file."""
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for block in iter(lambda: f.read(8192), b""):
                sha256.update(block)
        return sha256.hexdigest()

    def check_duplicate_hash(self, db: Session, file_hash: str) -> KnowledgeDocument | None:
        """Check if a file with the same hash already exists."""
        return (
            db.query(KnowledgeDocument)
            .filter(
                KnowledgeDocument.file_hash == file_hash,
                KnowledgeDocument.is_deleted == False,  # noqa: E712
            )
            .first()
        )

    async def store_file(self, file: UploadFile) -> tuple[Path, int]:
        """
        Save uploaded file to knowledge storage directory.
        Returns (saved_path, file_size).
        """
        upload_dir = Path(self.settings.knowledge_upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)

        # Generate unique filename to avoid collisions
        ext = Path(file.filename).suffix.lower()
        unique_name = f"{uuid.uuid4().hex}{ext}"
        target_path = upload_dir / unique_name

        content = await file.read()
        file_size = len(content)
        target_path.write_bytes(content)

        return target_path, file_size

    def store_file_sync(self, source_path: Path) -> tuple[Path, int]:
        """
        Copy a local file to knowledge storage directory (for batch import).
        Returns (saved_path, file_size).
        """
        upload_dir = Path(self.settings.knowledge_upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)

        ext = source_path.suffix.lower()
        unique_name = f"{uuid.uuid4().hex}{ext}"
        target_path = upload_dir / unique_name

        shutil.copy2(source_path, target_path)
        file_size = target_path.stat().st_size

        return target_path, file_size

    def create_document_record(
        self,
        db: Session,
        *,
        file_path: Path,
        original_filename: str,
        file_size: int,
        file_hash: str,
        document_type: DocumentType,
        metadata: dict | None = None,
        uploaded_by_id: int | None = None,
    ) -> KnowledgeDocument:
        """Create a KnowledgeDocument record and queue it for processing."""
        meta = metadata or {}

        doc = KnowledgeDocument(
            file_name=file_path.name,
            original_file_name=original_filename,
            file_path=str(file_path),
            file_size=file_size,
            file_hash=file_hash,
            document_type=document_type,
            source_type=meta.get("source_type", SourceType.textbook.value),
            doc_class=meta.get("class"),
            doc_subject=meta.get("subject"),
            doc_chapter=meta.get("chapter"),
            exam_type=meta.get("exam_type"),
            year=int(meta["year"]) if meta.get("year") else None,
            language=meta.get("language", "English"),
            tags=meta.get("tags"),
            extra_metadata={
                k: v for k, v in meta.items()
                if k not in ("class", "subject", "chapter", "source_type",
                             "exam_type", "year", "language", "tags")
            } or None,
            processing_status=ProcessingStatus.queued,
            uploaded_by_id=uploaded_by_id,
        )
        db.add(doc)
        db.flush()

        # Create processing job
        job = ProcessingJob(
            document_id=doc.id,
            priority=0,
            status=JobStatus.pending,
            max_retries=self.settings.max_processing_retries,
        )
        db.add(job)

        # Audit log
        db.add(IngestionAuditLog(
            document_id=doc.id,
            action=IngestionAction.uploaded,
            stage="upload",
            details={
                "original_filename": original_filename,
                "file_size": file_size,
                "document_type": document_type.value,
            },
            timestamp=datetime.utcnow(),
        ))

        db.flush()
        return doc

    async def upload_and_register(
        self,
        db: Session,
        file: UploadFile,
        metadata: dict | None = None,
        uploaded_by_id: int | None = None,
    ) -> tuple[KnowledgeDocument | None, str]:
        """
        Full upload flow: validate → store → hash → check duplicate → register.
        Returns (document, error_message).
        """
        filename = file.filename or "unknown"
        ext = Path(filename).suffix.lower()

        # Validate extension
        if ext not in ALLOWED_EXTENSIONS:
            allowed = ", ".join(ALLOWED_EXTENSIONS.keys())
            return None, f"Unsupported file type '{ext}'. Allowed: {allowed}"

        doc_type = ALLOWED_EXTENSIONS[ext]

        # Store file
        try:
            file_path, file_size = await self.store_file(file)
        except Exception as e:
            logger.error("Failed to store file %s: %s", filename, e)
            return None, f"Failed to store file: {e}"

        # Validate size
        valid, err = self.validate_file(filename, file_size)
        if not valid:
            file_path.unlink(missing_ok=True)
            return None, err

        # Compute hash
        file_hash = self.compute_file_hash(file_path)

        # Check for exact duplicate — create version if admin approves
        existing = self.check_duplicate_hash(db, file_hash)
        if existing:
            if metadata and metadata.get("create_version"):
                version_count = (
                    db.query(DocumentVersion)
                    .filter(DocumentVersion.document_id == existing.id)
                    .count()
                )
                new_version = DocumentVersion(
                    document_id=existing.id,
                    version_number=version_count + 1,
                    file_hash=file_hash,
                    file_path=str(file_path),
                    file_size=file_size,
                    is_active=True,
                    change_reason=metadata.get("change_reason"),
                    uploaded_by_id=uploaded_by_id,
                    metadata_snapshot=metadata,
                )
                # Deactivate previous versions
                db.query(DocumentVersion).filter(
                    DocumentVersion.document_id == existing.id
                ).update({"is_active": False})

                db.add(new_version)
                db.add(IngestionAuditLog(
                    document_id=existing.id,
                    action=IngestionAction.version_created,
                    stage="upload",
                    details={
                        "version": version_count + 1,
                        "file_hash": file_hash,
                        "original_filename": filename,
                    },
                    timestamp=datetime.utcnow(),
                ))
                db.commit()

                # Queue reprocessing with new file path
                existing.file_path = str(file_path)
                existing.file_hash = file_hash
                existing.file_size = file_size
                existing.processing_status = ProcessingStatus.queued
                db.commit()

                return existing, ""
            file_path.unlink(missing_ok=True)
            return None, (
                f"Duplicate file detected. This file was already uploaded as "
                f"'{existing.original_file_name}' (ID: {existing.id}). "
                f"Set create_version=true to create a new version instead."
            )

        # Create record
        try:
            doc = self.create_document_record(
                db,
                file_path=file_path,
                original_filename=filename,
                file_size=file_size,
                file_hash=file_hash,
                document_type=doc_type,
                metadata=metadata,
                uploaded_by_id=uploaded_by_id,
            )
            db.commit()
            return doc, ""
        except Exception as e:
            db.rollback()
            file_path.unlink(missing_ok=True)
            logger.error("Failed to create document record: %s", e)
            return None, f"Database error: {e}"


upload_service = UploadService()
