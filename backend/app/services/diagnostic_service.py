from __future__ import annotations

import random
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.enums import Difficulty, QuestionType
from app.models.knowledge_models import CanonicalQuestion
from app.models.models import ProgressTracking, Question, QuestionBank, Quiz, QuizAttempt, StudentProfile
from app.services.leaderboard_service import clamp_percent
from app.services.mock_test_service import mock_test_service
from app.services.progress_service import progress_service


class DiagnosticService:
    QUESTION_COUNT = 15

    def start_diagnostic(self, db: Session, student: StudentProfile, subject: str) -> Quiz:
        grade = student.grade

        # 1) Try CanonicalQuestion (KB)
        questions = (
            db.query(CanonicalQuestion)
            .filter(
                CanonicalQuestion.subject == subject,
                CanonicalQuestion.doc_class == str(grade),
            )
            .order_by(text("RAND()"))
            .limit(self.QUESTION_COUNT)
            .all()
        )

        # 2) Fallback to QuestionBank
        if not questions:
            questions = list(
                db.query(QuestionBank)
                .filter(
                    QuestionBank.grade == grade,
                    QuestionBank.subject == subject,
                    QuestionBank.question_type == QuestionType.mcq,
                )
                .order_by(text("RAND()"))
                .limit(self.QUESTION_COUNT)
                .all()
            )

        # 3) Fallback to quiz questions
        if not questions:
            existing_quiz_ids = (
                db.query(Quiz.id)
                .filter(Quiz.grade == grade, Quiz.subject == subject, Quiz.is_published.is_(True))
                .all()
            )
            if existing_quiz_ids:
                qids = [r[0] for r in existing_quiz_ids]
                questions = (
                    db.query(Question)
                    .filter(Question.quiz_id.in_(qids))
                    .order_by(text("RAND()"))
                    .limit(self.QUESTION_COUNT)
                    .all()
                )

        # No mock/sample fallback — real data only
        if not questions:
            raise ValueError(
                f"No questions found for grade {grade} subject '{subject}'. "
                "Upload documents via the Knowledge Base to generate questions."
            )

        quiz = Quiz(
            title=f"Diagnostic - {subject.title()}",
            grade=grade,
            subject=subject,
            quiz_type="diagnostic",
            duration_minutes=30,
            is_published=True,
        )
        db.add(quiz)
        db.flush()

        for src in questions:
            if isinstance(src, CanonicalQuestion):
                db.add(
                    Question(
                        quiz_id=quiz.id,
                        question_type=QuestionType.mcq,
                        prompt=src.question_text,
                        options=src.options or [],
                        correct_answer=src.answer,
                        textbook_explanation=src.explanation or "",
                        ai_explanation="",
                        difficulty=src.difficulty,
                    )
                )
            else:
                db.add(
                    Question(
                        quiz_id=quiz.id,
                        question_type=QuestionType.mcq,
                        prompt=src.prompt if hasattr(src, "prompt") else src["prompt"],
                        options=src.options if hasattr(src, "options") else src.get("options", []),
                        correct_answer=src.correct_answer if hasattr(src, "correct_answer") else src["correct_answer"],
                        textbook_explanation=getattr(src, "textbook_explanation", ""),
                        ai_explanation=getattr(src, "ai_explanation", ""),
                        difficulty=getattr(src, "difficulty", Difficulty.medium),
                    )
                )

        db.commit()
        db.refresh(quiz)
        return quiz

    def evaluate(
        self,
        db: Session,
        student: StudentProfile,
        quiz_id: int,
        answers: dict[str, str],
        seconds: int,
    ) -> dict:
        quiz = db.get(Quiz, quiz_id)
        if not quiz:
            raise ValueError("Quiz not found")

        correct = 0
        total = len(quiz.questions) if quiz else 0
        difficulty_breakdown: dict[str, dict] = {}

        for question in quiz.questions or []:
            submitted = str(answers.get(str(question.id), "")).strip().lower()
            expected = str(question.correct_answer).strip().lower()
            is_correct = self._is_correct(submitted, expected)
            if is_correct:
                correct += 1

            diff_key = question.difficulty.value if question.difficulty else "medium"
            if diff_key not in difficulty_breakdown:
                difficulty_breakdown[diff_key] = {"total": 0, "correct": 0}
            difficulty_breakdown[diff_key]["total"] += 1
            if is_correct:
                difficulty_breakdown[diff_key]["correct"] += 1

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
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

        recommendations = self._generate_recommendations(accuracy, difficulty_breakdown)

        return {
            "attempt_id": attempt.id,
            "quiz_id": quiz_id,
            "subject": quiz.subject,
            "score": correct,
            "total": total,
            "accuracy": accuracy,
            "time_taken_seconds": seconds,
            "difficulty_breakdown": [
                {"difficulty": k, "total": v["total"], "correct": v["correct"]}
                for k, v in difficulty_breakdown.items()
            ],
            "recommendations": recommendations,
            "created_at": attempt.created_at.isoformat() if attempt.created_at else datetime.utcnow().isoformat(),
        }

    def get_history(self, db: Session, student: StudentProfile, limit: int = 10) -> list[dict]:
        rows = (
            db.query(QuizAttempt)
            .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
            .filter(
                QuizAttempt.student_id == student.id,
                Quiz.quiz_type == "diagnostic",
            )
            .order_by(QuizAttempt.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": r.id,
                "quiz_id": r.quiz_id,
                "subject": r.quiz.subject if r.quiz else None,
                "score": r.score,
                "total": len(r.quiz.questions) if r.quiz and r.quiz.questions else 0,
                "accuracy": r.accuracy,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]

    def _is_correct(self, submitted: str, expected: str) -> bool:
        if submitted == expected:
            return True
        if len(expected) == 1 and submitted.startswith(f"{expected})"):
            return True
        if submitted and submitted[0] == expected[:1]:
            return True
        return False

    def _generate_recommendations(self, accuracy: float, difficulty_breakdown: dict) -> list[str]:
        recs = []
        if accuracy < 40:
            recs.append("Focus on building foundational concepts before attempting advanced topics.")
            recs.append("Review NCERT textbook chapters for your weak subjects.")
        elif accuracy < 70:
            recs.append("Good progress! Practice more PYQ papers to improve speed and accuracy.")
            recs.append("Identify specific chapters where you lose marks and revise them.")
        else:
            recs.append("Excellent! Focus on time management and attempt full-length mock tests.")
            recs.append("Challenge yourself with higher difficulty questions.")

        hard = difficulty_breakdown.get("hard", {})
        if hard.get("total", 0) > 0 and hard.get("correct", 0) < hard.get("total", 0) * 0.5:
            recs.append("Spend extra time on hard-difficulty topics marked in your progress tracker.")
        return recs


diagnostic_service = DiagnosticService()
