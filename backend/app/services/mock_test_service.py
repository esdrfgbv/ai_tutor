from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.enums import Difficulty, QuestionType
from app.models.knowledge_models import CanonicalQuestion, KnowledgeDocument
from app.models.models import Question, Quiz
from app.schemas.schemas import QuizGenerateIn


class MockTestService:
    def load_questions(
        self,
        subject: str,
        grade: int | None = None,
        db: Session | None = None,
    ) -> list[dict]:
        """Load questions from KB (CanonicalQuestion) or fall back to JSON files."""
        # 1) KB
        if db and grade:
            canonical = (
                db.query(CanonicalQuestion)
                .filter(
                    CanonicalQuestion.subject == subject,
                    CanonicalQuestion.doc_class == str(grade),
                )
                .order_by(CanonicalQuestion.id)
                .all()
            )
            if canonical:
                return [
                    {
                        "id": cq.id,
                        "test_name": cq.chapter or "General",
                        "question": cq.question_text,
                        "options": cq.options or [],
                        "correct_answer": cq.answer,
                        "difficulty": cq.difficulty.value if hasattr(cq.difficulty, "value") else str(cq.difficulty),
                        "source": "kb",
                    }
                    for cq in canonical
                ]

        # 2) JSON file fallback
        path = self._questions_path(subject, grade)
        if not path:
            return []
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)

    def _questions_path(self, subject: str, grade: int | None = None) -> Path | None:
        root = get_settings().source_root
        folder_map = {
            "maths": "maths mock tests",
            "science": "science mock tests",
            "mental-ability": "mental ability mock tests",
            "mental ability": "mental ability mock tests",
        }
        folder = folder_map.get(subject)
        if not folder:
            return None

        dir_name = f"class_{grade}"
        path = root / dir_name / folder / "questions.json"
        return path if path.exists() else None

    def list_tests(
        self,
        subject: str,
        grade: int | None = None,
        db: Session | None = None,
    ) -> list[dict]:
        questions = self.load_questions(subject, grade, db=db)
        grouped: dict[str, int] = {}
        for item in questions:
            name = item.get("test_name", "General Test")
            grouped[name] = grouped.get(name, 0) + 1
        return [
            {"test_name": name, "question_count": count, "subject": subject}
            for name, count in sorted(grouped.items())
        ]

    def get_test_questions(
        self,
        subject: str,
        test_name: str,
        grade: int | None = None,
        limit: int | None = None,
        db: Session | None = None,
    ) -> list[dict]:
        rows = [
            q
            for q in self.load_questions(subject, grade, db=db)
            if q.get("test_name") == test_name
        ]
        if limit:
            rows = rows[:limit]
        return [
            {
                "id": index + 1,
                "test_name": test_name,
                "prompt": row["question"],
                "options": row.get("options", []),
                "correct_answer": str(row.get("correct_answer", "")).strip(),
            }
            for index, row in enumerate(rows)
        ]

    def module_questions(
        self,
        subject: str,
        chapter_number: int,
        grade: int | None = None,
        count: int = 5,
        db: Session | None = None,
    ) -> list[dict]:
        tests = self.list_tests(subject, grade, db=db)
        if not tests:
            return []
        test_name = tests[(chapter_number - 1) % len(tests)]["test_name"]
        return self.get_test_questions(subject, test_name, grade, limit=count, db=db)

    def create_quiz_from_questions(
        self,
        db: Session,
        *,
        title: str,
        grade: int,
        subject: str,
        chapter: str | None,
        quiz_type: str,
        duration_minutes: int,
        questions: list[dict],
        created_by_id: int | None,
        module_order: int | None = None,
        quiz_order: int | None = None,
        normalized_module_name: str | None = None,
        source_pdf: str | None = None,
        scheduled_date: datetime | None = None,
        total_marks: int | None = None,
        negative_marking: float = 0.0,
    ) -> Quiz:
        quiz = Quiz(
            title=title,
            grade=grade,
            subject=subject,
            chapter=chapter,
            quiz_type=quiz_type,
            duration_minutes=duration_minutes,
            created_by_id=created_by_id,
            module_order=module_order,
            quiz_order=quiz_order,
            normalized_module_name=normalized_module_name,
            source_pdf=source_pdf,
            scheduled_date=scheduled_date,
            total_marks=total_marks,
            negative_marking=negative_marking,
        )
        db.add(quiz)
        db.flush()
        for item in questions:
            db.add(
                Question(
                    quiz_id=quiz.id,
                    question_type=QuestionType.mcq,
                    prompt=item["prompt"],
                    options=item.get("options"),
                    correct_answer=item["correct_answer"],
                    textbook_explanation="Refer to the chapter PDF for this concept.",
                    ai_explanation="Review the explanation in your module notes.",
                    difficulty=Difficulty.medium,
                    topic=item.get("test_name"),
                )
            )
        db.commit()
        db.refresh(quiz)
        return quiz

    def create_module_quiz(
        self,
        db: Session,
        request: QuizGenerateIn,
        created_by_id: int | None,
        chapter_number: int,
    ) -> Quiz:
        questions = self.module_questions(
            request.subject,
            chapter_number,
            request.grade,
            count=min(request.question_count, 10),
            db=db,
        )
        return self.create_quiz_from_questions(
            db,
            title=f"{request.subject.title()} Chapter {chapter_number} Module Test",
            grade=request.grade,
            subject=request.subject,
            chapter=str(chapter_number),
            quiz_type="module",
            duration_minutes=request.duration_minutes,
            questions=questions,
            created_by_id=created_by_id,
        )

    def create_mock_quiz(
        self,
        db: Session,
        request: QuizGenerateIn,
        created_by_id: int | None,
        test_name: str,
    ) -> Quiz:
        from app.services.module_service import module_service

        questions = self.get_test_questions(
            request.subject, test_name, request.grade,
            limit=request.question_count, db=db,
        )

        tests = self.list_tests(request.subject, request.grade, db=db)
        grouped = module_service.group_quizzes_by_module(
            request.subject, tests, request.grade, db=db,
        )

        mod_order = None
        q_order = None
        norm_name = None
        src_pdf = None
        display_title = test_name

        for group in grouped:
            for i, q in enumerate(group["quizzes"]):
                if q["raw_test_name"] == test_name:
                    mod_order = group["module_order"]
                    q_order = i + 1
                    norm_name = group["normalized_name"]
                    src_pdf = group["source_pdf"]
                    display_title = f"{group['module_name']} - {q['display_name']}"
                    break

        return self.create_quiz_from_questions(
            db,
            title=display_title,
            grade=request.grade,
            subject=request.subject,
            chapter=request.chapter,
            quiz_type="mock",
            duration_minutes=request.duration_minutes,
            questions=questions,
            created_by_id=created_by_id,
            module_order=mod_order,
            quiz_order=q_order,
            normalized_module_name=norm_name,
            source_pdf=src_pdf,
        )


mock_test_service = MockTestService()
