from sqlalchemy.orm import Session

from app.core.logging import logger
from app.models.models import AIConversation, User
from app.schemas.schemas import Citation, DoubtRequest, DoubtResponse
from app.services.ai_service import get_ai_provider
from app.services.vector_service import vector_service


class RAGService:
    def answer_doubt(self, db: Session, user: User, request: DoubtRequest) -> DoubtResponse:
        try:
            return self._answer(db, user, request)
        except Exception as exc:
            logger.exception("Doubt solver failed: %s", exc)
            return DoubtResponse(
                textbook_explanation="We could not reach the knowledge base right now. Please retry in a moment.",
                simplified_explanation="Try asking with your grade and subject selected. Example: 'Explain nouns for Class 6 English'.",
                examples=["Break the doubt into keywords and match them to your current chapter."],
                formulas=[],
                related_pyqs=["Review one PYQ from the same chapter after reading the textbook section."],
                practice_tips=["Rephrase the question with subject and chapter.", "Retry after refreshing the page."],
                citations=[],
                confidence=0.0,
            )

    def _answer(self, db: Session, user: User, request: DoubtRequest) -> DoubtResponse:
        base_filters = {"grade": request.grade, "subject": request.subject, "chapter": request.chapter}
        textbook = self._search_with_fallback(request.question, base_filters, "textbook", 5)
        pyqs = self._search_with_fallback(request.question, base_filters, "pyq", 4)

        if not textbook and not pyqs:
            return DoubtResponse(
                textbook_explanation="No indexed textbook or PYQ content matched this doubt yet. Run PDF ingestion for your grade and subject.",
                simplified_explanation=f"For '{request.question}', start with the chapter definition, then solve one worked example.",
                examples=["Write the definition first.", "Solve one small example step by step."],
                formulas=[],
                related_pyqs=["Practice one PYQ from the same chapter."],
                practice_tips=["Open the chapter PDF and revise the topic.", "Ask again with grade, subject, and chapter filled in."],
                citations=[],
                confidence=0.15,
            )

        context = "\n\n".join(
            f"[{item['metadata'].get('source_type')} | {item['metadata'].get('file_name', 'doc')} p.{item['metadata'].get('page_number')}] {item['text']}"
            for item in textbook + pyqs
        )
        system = (
            "You are an expert JNV and Sainik School tutor. Use only supplied context for textbook/PYQ citations. "
            "Return JSON: textbook_explanation, simplified_explanation, examples, formulas, related_pyqs, practice_tips."
        )
        prompt = f"Student doubt: {request.question}\nFilters: {base_filters}\nContext:\n{context[:12000]}"
        try:
            payload = get_ai_provider().generate_json(system, prompt)
        except Exception as exc:
            logger.warning("LLM unavailable, using local fallback: %s", exc)
            payload = self._local_response(request.question, textbook, pyqs)

        citations = [
            Citation(
                source=item["metadata"].get("file_name", "indexed document"),
                page_number=item["metadata"].get("page_number"),
                chapter=item["metadata"].get("chapter"),
                score=item["score"],
            )
            for item in textbook + pyqs
        ]
        confidence = self._confidence(textbook + pyqs)
        response = DoubtResponse(citations=citations, confidence=confidence, **payload)
        db.add(
            AIConversation(
                user_id=user.id,
                question=request.question,
                answer=response.model_dump_json(),
                citations=[c.model_dump() for c in citations],
            )
        )
        db.commit()
        return response

    def _search_with_fallback(self, question: str, base: dict, source_type: str, limit: int) -> list[dict]:
        attempts = [
            {**base, "source_type": source_type},
            {"grade": base.get("grade"), "source_type": source_type},
            {"source_type": source_type},
            None,
        ]
        for filters in attempts:
            clean = {k: v for k, v in (filters or {}).items() if v is not None}
            rows = vector_service.search(question, clean or None, limit=limit)
            if rows:
                return rows
        return []

    @staticmethod
    def _confidence(hits: list[dict]) -> float:
        if not hits:
            return 0.0
        avg = sum(item.get("score", 0) for item in hits) / len(hits)
        return round(max(0.0, min(1.0, avg)), 2)

    def _local_response(self, question: str, textbook: list[dict], pyqs: list[dict]) -> dict:
        source_text = " ".join(item["text"] for item in textbook[:3])
        pyq_text = [item["text"][:240] for item in pyqs[:3]]
        examples = [item["text"][:180] for item in textbook[:2]] or [
            "Write the definition, then solve one small example step by step.",
        ]
        return {
            "textbook_explanation": source_text[:900]
            or f"This doubt is about {question}. Revise the chapter definition and connect each step to that rule.",
            "simplified_explanation": f"Break '{question}' into keywords, recall the rule, solve a short example, then try a similar PYQ.",
            "examples": examples,
            "formulas": ["List known values, choose the rule, substitute carefully, verify units."],
            "related_pyqs": pyq_text
            or ["Practice one PYQ from the same chapter and compare reasoning steps."],
            "practice_tips": [
                "Revise the chapter definition first.",
                "Solve similar PYQs and review incorrect steps.",
            ],
        }


rag_service = RAGService()
