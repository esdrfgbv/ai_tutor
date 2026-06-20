"""
RAG Service
============
Production-grade RAG with knowledge-base retrieval, confidence scoring,
source citations, context compression, and duplicate-context removal.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.models.models import AIConversation, User
from app.schemas.schemas import DoubtRequest, DoubtResponse
from app.services.ai_service import get_ai_provider
from app.services.vector_service import vector_service

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are an AI tutor for competitive exam preparation (JNV, AISSEE, Olympiad).
Answer the student's question based on the provided textbook context.

Rules:
- If the context contains relevant information, answer using it and cite the source.
- If the context is insufficient, say so and provide a general explanation.
- Keep answers clear and grade-appropriate.
- Do not mention that you are an AI or that you are using context.
"""

CONFIDENCE_EXCELLENT = 0.95
CONFIDENCE_GOOD = 0.80
CONFIDENCE_FAIR = 0.60
CONFIDENCE_LOW = 0.30


@dataclass
class Citation:
    """A single source citation."""
    source: str
    relevance: float


@dataclass
class RAGResult:
    """Complete RAG response with traceability."""
    answer: str
    confidence: float
    citations: list[Citation]
    retrieval_trace: list[str]


class RAGService:
    def answer_doubt(self, db: Session, user: User, req: DoubtRequest) -> DoubtResponse:
        try:
            result = self._answer_with_rag(db, user, req)
            return DoubtResponse(
                answer=result.answer,
                source=(
                    "; ".join(c.source for c in result.citations[:3])
                    if result.citations else None
                ),
            )
        except Exception as exc:
            logger.exception("Doubt solver error: %s", exc)
            return DoubtResponse(
                answer="Could not process your question right now. Please try again."
            )

    def _answer_with_rag(
        self,
        db: Session,
        user: User,
        req: DoubtRequest,
    ) -> RAGResult:
        retrieval_trace: list[str] = []

        # ── 1. Retrieve from Knowledge Base ──────────────────────────────
        context, sources, confidence = self._retrieve_context(
            db, req, retrieval_trace,
        )

        # ── 2. Build prompt with compressed context ──────────────────────
        prompt = self._build_prompt(req, context, sources)

        # ── 3. Generate answer ───────────────────────────────────────────
        try:
            answer = get_ai_provider().generate_text(prompt)
        except Exception as exc:
            logger.warning("LLM unavailable: %s", exc)
            answer = self._build_fallback(req.question)
            confidence = min(confidence, CONFIDENCE_LOW)

        # ── 4. Build citations ───────────────────────────────────────────
        citations = [
            Citation(source=s, relevance=confidence)
            for s in sources[:5]
        ]

        # ── 5. Log conversation ───────────────────────────────────────────
        try:
            db.add(AIConversation(
                user_id=user.id,
                question=req.question,
                answer=answer[:2000],
                citations=[c.source for c in citations],
            ))
            db.commit()
        except Exception:
            db.rollback()

        return RAGResult(
            answer=answer,
            confidence=confidence,
            citations=citations,
            retrieval_trace=retrieval_trace,
        )

    def _retrieve_context(
        self,
        db: Session,
        req: DoubtRequest,
        trace: list[str],
    ) -> tuple[str, list[str], float]:
        """Retrieve and compress context from KB / legacy vector store."""
        context_parts: list[str] = []
        sources: list[str] = []
        seen_texts: set[str] = set()
        max_scores: list[float] = []

        # ── KB retrieval ─────────────────────────────────────────────────
        try:
            from app.services.knowledge.retrieval_service import retrieval_service

            response = retrieval_service.retrieve(
                db,
                req.question,
                n_results=5,
                doc_class=str(req.grade) if req.grade else None,
                subject=req.subject,
                chapter=req.chapter,
            )
            if response.results:
                trace.append(f"kb_retrieved:{len(response.results)}_results")
                for r in response.results:
                    text = r.text[:500]
                    dup_key = text[:100]
                    if dup_key in seen_texts:
                        continue
                    seen_texts.add(dup_key)
                    context_parts.append(f"- {text}")
                    max_scores.append(r.score)
                    if r.subject and r.chapter:
                        src = f"{r.subject}/{r.chapter}"
                    elif r.document_name:
                        src = r.document_name
                    else:
                        continue
                    if src not in sources:
                        sources.append(src)

                    if r.image_context:
                        desc = r.image_context.get("description", "")
                        if desc and desc[:100] not in seen_texts:
                            seen_texts.add(desc[:100])
                            context_parts.append(f"- [Diagram] {desc}")
        except Exception as e:
            trace.append(f"kb_failed:{e}")
            logger.debug("KB retrieval unavailable: %s", e)

        # ── Legacy fallback ──────────────────────────────────────────────
        if not context_parts:
            trace.append("legacy_fallback")
            filters = {}
            if req.subject:
                filters["subject"] = req.subject
            if req.chapter:
                filters["chapter"] = req.chapter
            if req.grade:
                filters["grade"] = str(req.grade)

            legacy_results = vector_service.query(
                req.question, n_results=3,
                filters=filters if filters else None,
            )
            for c in legacy_results:
                text = (c.get("text") or "")[:500]
                dup_key = text[:100]
                if dup_key in seen_texts:
                    continue
                seen_texts.add(dup_key)
                context_parts.append(f"- {text}")
                max_scores.append(1 - c.get("distance", 0))
                meta = c.get("metadata", {})
                if meta.get("subject") and meta.get("chapter"):
                    src = f"{meta['subject']}/{meta['chapter']}"
                    if src not in sources:
                        sources.append(src)

        # ── Compute confidence ────────────────────────────────────────────
        confidence = self._compute_confidence(max_scores, bool(context_parts))
        trace.append(f"confidence:{confidence:.2f}")

        # ── Compress context ──────────────────────────────────────────────
        compressed = self._compress_context(context_parts)
        trace.append(f"context_chunks:{len(context_parts)}_compressed_to:{len(compressed)}")

        return "\n".join(compressed), sources, confidence

    def _compute_confidence(self, scores: list[float], has_context: bool) -> float:
        if not scores or not has_context:
            return CONFIDENCE_LOW

        avg_score = sum(scores) / len(scores)
        if avg_score >= 0.9:
            return CONFIDENCE_EXCELLENT
        if avg_score >= 0.7:
            return CONFIDENCE_GOOD
        if avg_score >= 0.4:
            return CONFIDENCE_FAIR
        return CONFIDENCE_LOW

    def _compress_context(self, context_parts: list[str]) -> list[str]:
        """Deduplicate and limit context to most relevant chunks."""
        if len(context_parts) <= 3:
            return context_parts
        return context_parts[:3]

    def _build_prompt(
        self,
        req: DoubtRequest,
        context: str,
        sources: list[str],
    ) -> str:
        prompt = _SYSTEM_PROMPT

        if context:
            prompt += f"\n\nRelevant textbook context:\n{context}\n\n"
        if sources:
            prompt += f"Sources: {', '.join(sources)}\n\n"

        prompt += f"Student question: {req.question}\n\nAnswer:"
        return prompt

    @staticmethod
    def _build_fallback(question: str) -> str:
        return (
            f"**{question}**\n\n"
            "The AI service is temporarily unavailable.\n\n"
            "**What to do:** Open your textbook chapter and look for this topic "
            "in the index or headings."
        )


rag_service = RAGService()
