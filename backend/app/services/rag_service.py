from sqlalchemy.orm import Session

from app.core.logging import logger
from app.models.models import AIConversation, User
from app.schemas.schemas import DoubtRequest, DoubtResponse
from app.services.ai_service import get_ai_provider

_SYSTEM = "Answer briefly and clearly."

class RAGService:
    def answer_doubt(self, db: Session, user: User, req: DoubtRequest) -> DoubtResponse:
        try:
            return self._answer(db, user, req)
        except Exception as exc:
            logger.exception("Doubt solver error: %s", exc)
            return DoubtResponse(answer="Could not process your question right now. Please try again.")

    def _answer(self, db: Session, user: User, req: DoubtRequest) -> DoubtResponse:
        prompt = f"Q: {req.question}"
        if req.subject:
            prompt += f" [{req.subject}"
            if req.chapter:
                prompt += f", {req.chapter}"
            prompt += "]"

        try:
            answer = get_ai_provider().generate_text(
                f"{_SYSTEM}\n\n{prompt}"
            )
        except Exception as exc:
            logger.warning("LLM unavailable: %s", exc)
            answer = self._build_fallback(req.question)

        try:
            db.add(AIConversation(
                user_id=user.id,
                question=req.question,
                answer=answer[:2000],
                citations=[],
            ))
            db.commit()
        except Exception:
            db.rollback()

        return DoubtResponse(answer=answer, source=None)

    @staticmethod
    def _build_fallback(question: str) -> str:
        return (
            f"**{question}**\n\n"
            "The AI service is temporarily unavailable.\n\n"
            "**What to do:** Open your textbook chapter and look for this topic in the index or headings."
        )

rag_service = RAGService()
