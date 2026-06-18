from sqlalchemy.orm import Session

from app.core.logging import logger
from app.models.models import AIConversation, User
from app.schemas.schemas import DoubtRequest, DoubtResponse
from app.services.ai_service import get_ai_provider
from app.services.vector_service import vector_service

_SYSTEM = "Answer briefly and clearly."

class RAGService:
    def answer_doubt(self, db: Session, user: User, req: DoubtRequest) -> DoubtResponse:
        try:
            return self._answer(db, user, req)
        except Exception as exc:
            logger.exception("Doubt solver error: %s", exc)
            return DoubtResponse(answer="Could not process your question right now. Please try again.")

    def _answer(self, db: Session, user: User, req: DoubtRequest) -> DoubtResponse:
        filters = {}
        if req.subject:
            filters["subject"] = req.subject
        if req.chapter:
            filters["chapter"] = req.chapter
        if req.grade:
            filters["grade"] = req.grade

        context_chunks = vector_service.query(
            query_text=req.question,
            n_results=5,
            filters=filters if filters else None,
        )

        context = ""
        sources = []
        if context_chunks:
            for c in context_chunks:
                context += f"\n- {c['text'][:500]}"
                meta = c.get("metadata", {})
                if meta.get("subject") and meta.get("chapter"):
                    src = f"{meta['subject']}/{meta['chapter']}"
                    if src not in sources:
                        sources.append(src)

        prompt = f"Q: {req.question}"
        if req.subject:
            prompt += f" [{req.subject}"
            if req.chapter:
                prompt += f", {req.chapter}"
            prompt += "]"

        if context:
            full_prompt = (
                f"{_SYSTEM}\n\n"
                f"Relevant textbook context:\n{context}\n\n"
                f"Student question: {req.question}\n\n"
                "Answer based on the textbook context above. If the context doesn't contain enough information, say so and provide a general explanation."
            )
        else:
            full_prompt = f"{_SYSTEM}\n\n{prompt}"

        try:
            answer = get_ai_provider().generate_text(full_prompt)
            source_label = "; ".join(sources[:3]) if sources else None
        except Exception as exc:
            logger.warning("LLM unavailable: %s", exc)
            answer = self._build_fallback(req.question)
            source_label = None

        try:
            db.add(AIConversation(
                user_id=user.id,
                question=req.question,
                answer=answer[:2000],
                citations=sources[:5] if sources else [],
            ))
            db.commit()
        except Exception:
            db.rollback()

        return DoubtResponse(answer=answer, source=source_label)

    @staticmethod
    def _build_fallback(question: str) -> str:
        return (
            f"**{question}**\n\n"
            "The AI service is temporarily unavailable.\n\n"
            "**What to do:** Open your textbook chapter and look for this topic in the index or headings."
        )

rag_service = RAGService()
