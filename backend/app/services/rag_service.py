from sqlalchemy.orm import Session

from app.core.logging import logger
from app.models.models import AIConversation, User
from app.schemas.schemas import DoubtRequest, DoubtResponse
from app.services.ai_service import get_ai_provider
from app.services.vector_service import vector_service

# Ultra-compact system prompt: ~80 tokens
_SYSTEM = (
    "You are a concise textbook tutor for Indian school students (Class 6-9). "
    "Answer using ONLY: 1) Concept (2-3 sentences), 2) Example (step-by-step), 3) Common Mistake (1 sentence). "
    "Use the provided textbook context. No greetings, no filler, no introductions. Keep under 200 words."
)


class RAGService:
    def answer_doubt(self, db: Session, user: User, req: DoubtRequest) -> DoubtResponse:
        try:
            return self._answer(db, user, req)
        except Exception as exc:
            logger.exception("Doubt solver error: %s", exc)
            return DoubtResponse(answer="Could not process your question right now. Please try again.")

    def _retrieve(self, req: DoubtRequest) -> list[dict]:
        """Retrieve top 2 chunks. Slug-first, then fallback to subject/grade."""
        if req.slug:
            hits = vector_service.search(req.question, {"file_name": f"{req.slug}.pdf"}, limit=2)
            if hits:
                return hits

        filters = {}
        if req.grade:
            filters["grade"] = req.grade
        if req.subject:
            filters["subject"] = req.subject
        if filters:
            hits = vector_service.search(req.question, filters, limit=2)
            if hits:
                return hits

        return vector_service.search(req.question, limit=2)

    def _answer(self, db: Session, user: User, req: DoubtRequest) -> DoubtResponse:
        chunks = self._retrieve(req)

        # Build compact context: max 500 chars per chunk
        context = ""
        source_name = None
        if chunks:
            parts = []
            for c in chunks[:2]:
                text = c["text"][:500]
                src = c["metadata"].get("file_name", "")
                page = c["metadata"].get("page_number")
                if src and not source_name:
                    source_name = src.replace(".pdf", "")
                    if page:
                        source_name += f" p.{page}"
                parts.append(text)
            context = "\n---\n".join(parts)

        # Build user prompt — extremely compact
        prompt = ""
        if context:
            prompt += f"Context:\n{context}\n\n"
        prompt += f"Q: {req.question}"
        if req.subject:
            prompt += f" [{req.subject}"
            if req.chapter:
                prompt += f", {req.chapter}"
            prompt += "]"

        # Call LLM
        try:
            answer = get_ai_provider().generate_text(_SYSTEM, prompt)
        except Exception as exc:
            logger.warning("LLM unavailable: %s", exc)
            answer = self._build_fallback(req.question, chunks)

        # Save conversation (non-blocking, best-effort)
        try:
            db.add(AIConversation(
                user_id=user.id,
                question=req.question,
                answer=answer[:2000],
                citations=[{"source": source_name}] if source_name else [],
            ))
            db.commit()
        except Exception:
            db.rollback()

        return DoubtResponse(answer=answer, source=source_name)

    @staticmethod
    def _build_fallback(question: str, chunks: list[dict]) -> str:
        """Construct a useful answer from textbook chunks when LLM is unavailable."""
        if not chunks:
            return (
                f"**{question}**\n\n"
                "The AI service is temporarily unavailable and no textbook content was found for this query.\n\n"
                "**What to do:** Open your textbook chapter and look for this topic in the index or headings."
            )

        # Clean and present textbook content directly
        parts = [f"**{question}**\n"]
        parts.append("*AI service temporarily unavailable — showing relevant textbook content:*\n")

        for i, chunk in enumerate(chunks[:2]):
            text = chunk["text"].strip()
            # Trim to reasonable length and end at a sentence boundary
            if len(text) > 600:
                cut = text[:600].rfind(".")
                text = text[: cut + 1] if cut > 100 else text[:600] + "..."
            src = chunk["metadata"].get("file_name", "")
            page = chunk["metadata"].get("page_number")
            label = f"📖 {src}" if src else f"Source {i + 1}"
            if page:
                label += f" (p.{page})"
            parts.append(f"**{label}:**\n{text}\n")

        return "\n".join(parts)


rag_service = RAGService()
