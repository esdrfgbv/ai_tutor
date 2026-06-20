"""
Deduplication Service
======================
Multi-layer deduplication to prevent redundant content in the knowledge base.

Layers:
  1. SHA256 file hash — exact file duplicates
  2. Chunk hash — exact chunk duplicates within a document
  3. MinHash — near-duplicate text detection (≥90 % overlap)
  4. Semantic embedding — cosine-similarity dedup (configurable threshold)
  5. Canonical question hash — same question across sources
"""

from __future__ import annotations

import hashlib
import logging
import re
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.knowledge_models import (
    CanonicalQuestion,
    KnowledgeChunk,
    KnowledgeDocument,
    QuestionSourceLink,
)
from app.services.vector_service import vector_service

logger = logging.getLogger(__name__)

# ── Try optional MinHash library ────────────────────────────────────────
try:
    import datasketch  # noqa: F401

    _HAS_DATASKETCH = True
except ImportError:
    _HAS_DATASKETCH = False

# ── Constants ───────────────────────────────────────────────────────────
MINHASH_NUM_PERM = 128
MINHASH_THRESHOLD = 0.90


def _munge(text: str) -> str:
    """Light normalisation: lowercase, collapse whitespace, remove punctuation."""
    t = text.lower().strip()
    t = re.sub(r"[^\w\s]", "", t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def _shingle_set(text: str, k: int = 5) -> set[str]:
    """Produce a set of character-level k-shingles."""
    munged = _munge(text)
    if len(munged) < k:
        return {munged}
    return {munged[i : i + k] for i in range(len(munged) - k + 1)}


# ══════════════════════════════════════════════════════════════════════════


class DeduplicationService:
    """Multi-layer content deduplication."""

    def __init__(self):
        self.settings = get_settings()
        self.similarity_threshold = self.settings.dedup_similarity_threshold

    # ── Layer 1: File-level exact duplicate (SHA256) ─────────────────────

    def check_file_duplicate(
        self, db: Session, file_hash: str
    ) -> KnowledgeDocument | None:
        exit_q = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.file_hash == file_hash,
            KnowledgeDocument.is_deleted.is_(False),
        )
        return exit_q.first()

    # ── Layer 2: Chunk-level exact duplicate (SHA256) ─────────────────────

    def check_chunk_duplicate(
        self, db: Session, chunk_hash: str, document_id: int
    ) -> bool:
        return (
            db.query(KnowledgeChunk)
            .filter(
                KnowledgeChunk.chunk_hash == chunk_hash,
                KnowledgeChunk.document_id == document_id,
            )
            .first()
            is not None
        )

    def deduplicate_chunks(
        self, chunks: list[dict], document_id: int, db: Session
    ) -> list[dict]:
        seen_hashes: set[str] = set()
        unique_chunks: list[dict] = []

        for chunk in chunks:
            chunk_hash = chunk.get("chunk_hash", "")
            if not chunk_hash:
                chunk_hash = hashlib.sha256(chunk.get("text", "").encode()).hexdigest()
                chunk["chunk_hash"] = chunk_hash

            if chunk_hash in seen_hashes:
                continue
            seen_hashes.add(chunk_hash)

            if not self.check_chunk_duplicate(db, chunk_hash, document_id):
                unique_chunks.append(chunk)

        deduped = len(chunks) - len(unique_chunks)
        if deduped:
            logger.info("Layer 2 deduped %d/%d chunks for doc %d", deduped, len(chunks), document_id)

        return unique_chunks

    # ── Layer 3: MinHash near-duplicate detection ────────────────────────

    def compute_minhash(self, text: str) -> list[int] | None:
        """
        Return a MinHash signature (list of ints) for the given text.
        Returns None if the text is too short for meaningful comparison.
        """
        munged = _munge(text)
        if len(munged) < 20:
            return None

        shingles = _shingle_set(munged, k=5)
        if len(shingles) < 3:
            return None

        if _HAS_DATASKETCH:
            m = datasketch.MinHash(num_perm=MINHASH_NUM_PERM)
            for s in shingles:
                m.update(s.encode())
            return m.hashvalues.tolist()

        # Lightweight fallback: hash each shingle and take the MINHASH_NUM_PERM
        # smallest values — a poor-man's MinHash that's good enough for
        # approximate work.
        hashed = sorted(int(hashlib.md5(s.encode()).hexdigest()[:8], 16) for s in shingles)
        return hashed[:MINHASH_NUM_PERM]

    def _jaccard_from_signatures(self, sig_a: list[int], sig_b: list[int]) -> float:
        """Estimate Jaccard similarity from two MinHash signatures."""
        if not sig_a or not sig_b:
            return 0.0
        common = sum(1 for a, b in zip(sig_a, sig_b) if a == b)
        return common / max(len(sig_a), len(sig_b))

    def find_near_duplicate_chunks(
        self,
        db: Session,
        text: str,
        document_id: int,
        threshold: float = MINHASH_THRESHOLD,
    ) -> list[dict[str, Any]]:
        """
        Scan existing chunks across all documents (except the current one)
        for near-duplicate content using MinHash.
        """
        sig = self.compute_minhash(text)
        if sig is None:
            return []

        candidates: list[dict[str, Any]] = []
        existing = (
            db.query(KnowledgeChunk)
            .filter(KnowledgeChunk.document_id != document_id)
            .limit(500)
            .all()
        )

        for chunk in existing:
            other_sig = self.compute_minhash(chunk.chunk_text)
            if other_sig is None:
                continue
            sim = self._jaccard_from_signatures(sig, other_sig)
            if sim >= threshold:
                candidates.append({
                    "chunk_id": chunk.id,
                    "document_id": chunk.document_id,
                    "similarity": round(sim, 4),
                    "text_preview": chunk.chunk_text[:200],
                })

        return sorted(candidates, key=lambda x: x["similarity"], reverse=True)

    # ── Layer 4: Semantic dedup via embeddings ────────────────────────────

    def check_semantic_duplicate(
        self,
        text: str,
        threshold: float | None = None,
    ) -> dict[str, Any] | None:
        """
        Use vector similarity search to detect semantically similar content
        already in the KB collection.

        Returns the closest match if similarity >= threshold, else None.
        """
        thr = threshold if threshold is not None else self.similarity_threshold
        results = vector_service.query(text, n_results=5)
        for r in results:
            distance = r.get("distance", 1.0)
            similarity = 1.0 - distance if distance <= 1.0 else 0.0
            if similarity >= thr:
                return {
                    "vector_id": r["id"],
                    "similarity": round(similarity, 4),
                    "text_preview": r.get("text", "")[:200],
                    "metadata": r.get("metadata", {}),
                }
        return None

    # ── Layer 5: Question-level canonical deduplication ───────────────────

    def compute_question_hash(self, question_text: str, options: list[str] | None = None) -> str:
        normalized = _munge(question_text)
        parts = [normalized]
        if options:
            sorted_opts = sorted(_munge(opt) for opt in options if opt)
            parts.extend(sorted_opts)
        return hashlib.sha256("|".join(parts).encode()).hexdigest()

    def find_or_create_canonical_question(
        self,
        db: Session,
        *,
        question_text: str,
        options: list[str] | None = None,
        answer: str = "",
        explanation: str = "",
        difficulty: str = "medium",
        topic: str | None = None,
        chapter: str | None = None,
        subject: str | None = None,
        doc_class: str | None = None,
        has_image: bool = False,
        image_context: str | None = None,
        document_id: int,
        source_type: str = "textbook",
        page_number: int | None = None,
        question_number: int | None = None,
    ) -> tuple[CanonicalQuestion, bool]:
        canonical_hash = self.compute_question_hash(question_text, options)
        existing = (
            db.query(CanonicalQuestion)
            .filter(CanonicalQuestion.canonical_hash == canonical_hash)
            .first()
        )

        if existing:
            link_exists = (
                db.query(QuestionSourceLink)
                .filter(
                    QuestionSourceLink.question_id == existing.id,
                    QuestionSourceLink.document_id == document_id,
                )
                .first()
            )
            if not link_exists:
                db.add(QuestionSourceLink(
                    question_id=existing.id,
                    document_id=document_id,
                    source_type=source_type,
                    page_number=page_number,
                    question_number=question_number,
                ))
            return existing, False

        question = CanonicalQuestion(
            canonical_hash=canonical_hash,
            question_text=question_text,
            options=options,
            answer=answer,
            explanation=explanation,
            difficulty=difficulty,
            topic=topic,
            chapter=chapter,
            subject=subject,
            doc_class=doc_class,
            has_image=has_image,
            image_context=image_context,
        )
        db.add(question)
        db.flush()

        db.add(QuestionSourceLink(
            question_id=question.id,
            document_id=document_id,
            source_type=source_type,
            page_number=page_number,
            question_number=question_number,
        ))

        return question, True

    # ── Content fingerprint (SimHash) ────────────────────────────────────

    def compute_content_fingerprint(self, text: str) -> str:
        """Compute a SimHash-like fingerprint for near-duplicate detection."""
        normalized = _munge(text)
        words = normalized.split()
        if len(words) < 5:
            return hashlib.sha256(normalized.encode()).hexdigest()

        ngrams = set()
        for i in range(len(words) - 2):
            ngrams.add(" ".join(words[i : i + 3]))

        fingerprint_text = "|".join(sorted(ngrams))
        return hashlib.sha256(fingerprint_text.encode()).hexdigest()[:16]

    def check_content_duplicate(
        self, db: Session, fingerprint: str, exclude_id: int | None = None
    ) -> KnowledgeDocument | None:
        query = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.content_fingerprint == fingerprint,
            KnowledgeDocument.is_deleted.is_(False),
        )
        if exclude_id:
            query = query.filter(KnowledgeDocument.id != exclude_id)
        return query.first()

    # ── Stats ────────────────────────────────────────────────────────────

    def get_dedup_stats(self, db: Session) -> dict:
        total_questions = db.query(CanonicalQuestion).count()
        total_sources = db.query(QuestionSourceLink).count()
        duplicate_questions = max(0, total_sources - total_questions)

        return {
            "total_canonical_questions": total_questions,
            "total_question_sources": total_sources,
            "duplicate_questions_prevented": duplicate_questions,
            "dedup_rate": round(duplicate_questions / max(total_sources, 1) * 100, 1) if total_sources else 0.0,
        }


deduplication_service = DeduplicationService()
