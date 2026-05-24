import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.enums import Difficulty, QuestionType
from app.models.models import Question, Quiz
from app.schemas.schemas import QuizGenerateIn
from app.services.chapter_service import class_content_root


class MockTestService:
    def _questions_path(self, subject: str) -> Path | None:
        folder = "maths mock tests" if subject == "maths" else "science mock tests"
        path = class_content_root() / folder / "questions.json"
        return path if path.exists() else None

    def load_questions(self, subject: str) -> list[dict]:
        path = self._questions_path(subject)
        if not path:
            return []
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)

    def list_tests(self, subject: str) -> list[dict]:
        questions = self.load_questions(subject)
        grouped: dict[str, int] = {}
        for item in questions:
            name = item.get("test_name", "General Test")
            grouped[name] = grouped.get(name, 0) + 1
        return [{"test_name": name, "question_count": count, "subject": subject} for name, count in sorted(grouped.items())]

    def get_test_questions(self, subject: str, test_name: str, limit: int | None = None) -> list[dict]:
        rows = [q for q in self.load_questions(subject) if q.get("test_name") == test_name]
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

    def module_questions(self, subject: str, chapter_number: int, count: int = 5) -> list[dict]:
        tests = self.list_tests(subject)
        if not tests:
            return []
        test_name = tests[(chapter_number - 1) % len(tests)]["test_name"]
        return self.get_test_questions(subject, test_name, limit=count)

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

    def create_module_quiz(self, db: Session, request: QuizGenerateIn, created_by_id: int | None, chapter_number: int) -> Quiz:
        questions = self.module_questions(request.subject, chapter_number, count=min(request.question_count, 10))
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

    def create_mock_quiz(self, db: Session, request: QuizGenerateIn, created_by_id: int | None, test_name: str) -> Quiz:
        from app.services.module_service import module_service
        questions = self.get_test_questions(request.subject, test_name, limit=request.question_count)
        
        # Find module metadata
        tests = self.list_tests(request.subject)
        grouped = module_service.group_quizzes_by_module(request.subject, tests)
        
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
