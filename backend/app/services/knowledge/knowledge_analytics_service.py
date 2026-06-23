"""
Knowledge Analytics Service
=============================
Provides snapshot analytics, time-series rollups (daily/weekly/monthly),
and ingestion pipeline metrics for the Knowledge Base.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.compat import date_trunc_expr
from app.models.enums import JobStatus, ProcessingStatus
from app.models.models import QuestionBank
from app.models.knowledge_models import (
    DocumentVersion,
    IngestionAuditLog,
    KnowledgeChunk,
    KnowledgeDocument,
    KnowledgeEmbedding,
    KnowledgeImage,
    KnowledgeTable,
    ProcessingJob,
)
from app.services.vector_service import vector_service

logger = logging.getLogger(__name__)


class KnowledgeAnalyticsService:

    def get_snapshot(self, db: Session) -> dict:
        """
        Current-state snapshot of the entire knowledge base.
        Returns the data for KnowledgeAnalyticsOut.
        """
        total_docs = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.is_deleted.is_(False),
        ).count()

        total_chunks = db.query(KnowledgeChunk).count()
        total_questions = db.query(QuestionBank).count()
        total_embeddings = db.query(KnowledgeEmbedding).count()
        total_tables = db.query(KnowledgeTable).count()
        total_images = db.query(KnowledgeImage).count()
        total_versions = db.query(DocumentVersion).count()

        docs_by_status = self._grouped_count(
            db, KnowledgeDocument, KnowledgeDocument.processing_status,
            KnowledgeDocument.is_deleted.is_(False),
        )
        docs_by_type = self._grouped_count(
            db, KnowledgeDocument, KnowledgeDocument.document_type,
            KnowledgeDocument.is_deleted.is_(False),
        )
        docs_by_source = self._grouped_count(
            db, KnowledgeDocument, KnowledgeDocument.source_type,
            KnowledgeDocument.is_deleted.is_(False),
        )

        from app.services.knowledge.deduplication_service import deduplication_service
        dedup_stats = deduplication_service.get_dedup_stats(db)

        failed = docs_by_status.get("failed", 0)
        failure_rate = round(failed / max(total_docs, 1) * 100, 1)

        ocr_rate = self._compute_ocr_success_rate(db)
        avg_time = self._compute_avg_processing_time(db)

        vector_health = vector_service.get_collection_stats()

        pending_jobs = db.query(ProcessingJob).filter(
            ProcessingJob.status == JobStatus.pending,
        ).count()

        failed_jobs = db.query(ProcessingJob).filter(
            ProcessingJob.status == JobStatus.failed,
        ).count()

        dead_letter_jobs = db.query(ProcessingJob).filter(
            ProcessingJob.status == JobStatus.dead_letter,
        ).count()

        return {
            "total_documents": total_docs,
            "total_chunks": total_chunks,
            "total_questions": total_questions,
            "total_embeddings": total_embeddings,
            "total_tables": total_tables,
            "total_images": total_images,
            "total_versions": total_versions,
            "documents_by_status": docs_by_status,
            "documents_by_type": docs_by_type,
            "documents_by_source": docs_by_source,
            "duplicate_rate": dedup_stats.get("dedup_rate", 0),
            "processing_failure_rate": failure_rate,
            "ocr_success_rate": ocr_rate,
            "avg_processing_time_ms": avg_time,
            "pending_jobs": pending_jobs,
            "failed_jobs": failed_jobs,
            "dead_letter_jobs": dead_letter_jobs,
            "vector_store_health": vector_health,
        }

    def get_ingestion_metrics(self, db: Session, days: int = 7) -> dict:
        """
        Ingestion pipeline metrics for the last N days.
        Returns data for IngestionMetricsOut.
        """
        since = datetime.utcnow() - timedelta(days=days)

        total_processed = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.processing_status == ProcessingStatus.completed,
            KnowledgeDocument.processing_completed_at >= since,
        ).count()

        total_failed = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.processing_status == ProcessingStatus.failed,
            KnowledgeDocument.processing_started_at >= since,
        ).count()

        total_queued = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.processing_status == ProcessingStatus.queued,
            KnowledgeDocument.created_at >= since,
        ).count()

        completed_docs = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.processing_status == ProcessingStatus.completed,
            KnowledgeDocument.processing_completed_at >= since,
        ).all()

        if completed_docs:
            avg_chunks = sum(
                (d.total_chunks or 0) for d in completed_docs
            ) / len(completed_docs)
            avg_pages = sum(
                (d.total_pages or 0) for d in completed_docs
            ) / len(completed_docs)
        else:
            avg_chunks = 0.0
            avg_pages = 0.0

        recent_jobs = (
            db.query(ProcessingJob)
            .filter(ProcessingJob.started_at >= since)
            .order_by(ProcessingJob.started_at.desc())
            .limit(10)
            .all()
        )

        return {
            "total_processed": total_processed,
            "total_failed": total_failed,
            "total_queued": total_queued,
            "avg_chunks_per_doc": round(avg_chunks, 1),
            "avg_pages_per_doc": round(avg_pages, 1),
            "recent_jobs": recent_jobs,
        }

    def get_rollup(
        self, db: Session, *,
        period: str = "daily",
        since: datetime | None = None,
    ) -> list[dict]:
        """
        Time-series rollup of ingestion activity.
        Period: 'daily', 'weekly', or 'monthly'.
        """
        if since is None:
            since = datetime.utcnow() - timedelta(days=30)

        base = db.query(
            IngestionAuditLog.stage,
            IngestionAuditLog.action,
            IngestionAuditLog.duration_ms,
            IngestionAuditLog.timestamp,
            IngestionAuditLog.details,
        ).filter(
            IngestionAuditLog.timestamp >= since,
        )

        trunc = date_trunc_expr(period, IngestionAuditLog.timestamp)

        rows = (
            base.with_entities(
                trunc.label("bucket"),
                func.count().label("events"),
                func.avg(IngestionAuditLog.duration_ms).label("avg_duration_ms"),
            )
            .group_by(trunc)
            .order_by(trunc)
            .all()
        )

        return [
            {
                "bucket": str(row.bucket),
                "events": row.events,
                "avg_duration_ms": (
                    round(float(row.avg_duration_ms), 1)
                    if row.avg_duration_ms else 0
                ),
            }
            for row in rows
        ]

    # ── Private helpers ────────────────────────────────────────────────────

    @staticmethod
    def _grouped_count(
        db: Session,
        model,
        column,
        *filters,
    ) -> dict[str, int]:
        """Run a grouped COUNT query and return as {key: count}."""
        rows = dict(
            db.query(column, func.count(model.id))
            .filter(*filters)
            .group_by(column)
            .all()
        )
        return {
            (k.value if hasattr(k, 'value') else str(k)): v
            for k, v in rows.items()
        }

    @staticmethod
    def _compute_ocr_success_rate(db: Session) -> float:
        """Compute OCR success rate from audit logs."""
        ocr_logs = (
            db.query(IngestionAuditLog)
            .filter(IngestionAuditLog.stage == "extract")
            .all()
        )
        attempts = 0
        successes = 0
        for log in ocr_logs:
            details = log.details or {}
            if "ocr_pages" in details:
                attempts += 1
                if details.get("ocr_pages", 0) > 0:
                    successes += 1
        if attempts == 0:
            return 100.0
        return round(successes / attempts * 100, 1)

    @staticmethod
    def _compute_avg_processing_time(db: Session) -> int:
        """Average processing duration from completed audit logs."""
        logs = (
            db.query(IngestionAuditLog)
            .filter(
                IngestionAuditLog.action == "completed",
                IngestionAuditLog.duration_ms.isnot(None),
            )
            .all()
        )
        if not logs:
            return 0
        times = [l.duration_ms for l in logs if l.duration_ms]
        if not times:
            return 0
        return int(sum(times) / len(times))


knowledge_analytics_service = KnowledgeAnalyticsService()
