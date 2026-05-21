from sqlalchemy.orm import Session

from app.models.models import Quiz, QuizAttempt, QuizTimerState, StudentProfile
from app.schemas.schemas import QuizGenerateIn
from app.services.leaderboard_service import clamp_percent
from app.services.mock_test_service import mock_test_service
from app.services.progress_service import progress_service


class QuizService:
    @staticmethod
    def _is_correct(submitted: str, expected: str) -> bool:
        if submitted == expected:
            return True
        if len(expected) == 1 and submitted.startswith(f"{expected})"):
            return True
        if submitted and submitted[0] == expected[:1]:
            return True
        return False

    def create_module_quiz(self, db: Session, request: QuizGenerateIn, created_by_id: int | None, chapter_number: int) -> Quiz:
        return mock_test_service.create_module_quiz(db, request, created_by_id, chapter_number)

    def create_mock_quiz(self, db: Session, request: QuizGenerateIn, created_by_id: int | None, test_name: str) -> Quiz:
        return mock_test_service.create_mock_quiz(db, request, created_by_id, test_name)

    def score_attempt(
        self,
        db: Session,
        student: StudentProfile,
        quiz_id: int,
        answers: dict[str, str],
        seconds: int,
    ) -> QuizAttempt:
        quiz = db.get(Quiz, quiz_id)
        correct = 0
        total = len(quiz.questions) if quiz else 0
        for question in quiz.questions if quiz else []:
            submitted = str(answers.get(str(question.id), "")).strip().lower()
            expected = str(question.correct_answer).strip().lower()
            if self._is_correct(submitted, expected):
                correct += 1
        accuracy = clamp_percent((correct / total) * 100) if total else 0
        attempt = QuizAttempt(
            student_id=student.id,
            quiz_id=quiz_id,
            answers=answers,
            score=correct,
            accuracy=accuracy,
            time_taken_seconds=seconds,
        )
        student.total_points += int(correct * 10)
        if quiz and quiz.quiz_type == "module" and quiz.chapter:
            progress_service.record_module_pass(
                db,
                student,
                quiz.grade,
                quiz.subject,
                int(quiz.chapter),
                slug="",
                accuracy=accuracy,
            )
        db.add(attempt)
        db.query(QuizTimerState).filter_by(student_id=student.id, quiz_id=quiz_id).delete()
        db.commit()
        db.refresh(attempt)
        return attempt

    def sync_timer(self, db: Session, student: StudentProfile, quiz_id: int, remaining_seconds: int) -> None:
        row = db.query(QuizTimerState).filter_by(student_id=student.id, quiz_id=quiz_id).first()
        if not row:
            row = QuizTimerState(student_id=student.id, quiz_id=quiz_id, remaining_seconds=remaining_seconds)
            db.add(row)
        else:
            row.remaining_seconds = max(0, remaining_seconds)
        db.commit()

    def get_timer(self, db: Session, student: StudentProfile, quiz_id: int) -> int | None:
        row = db.query(QuizTimerState).filter_by(student_id=student.id, quiz_id=quiz_id).first()
        return row.remaining_seconds if row else None


quiz_service = QuizService()
