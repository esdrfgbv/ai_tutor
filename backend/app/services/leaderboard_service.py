from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import Quiz, QuizAttempt, StudentProfile
from app.schemas.schemas import LeaderboardRow


def clamp_percent(value: float) -> float:
    return round(max(0.0, min(100.0, value)), 2)


class LeaderboardService:
    def build(self, db: Session, grade: int | None = None, subject: str | None = None, limit: int = 50) -> list[LeaderboardRow]:
        query = (
            db.query(
                StudentProfile.id.label("student_id"),
                func.max(QuizAttempt.score).label("best_score"),
                func.max(QuizAttempt.accuracy).label("best_accuracy"),
                func.coalesce(
                    func.min(func.nullif(QuizAttempt.time_taken_seconds, 0)),
                    999999,
                ).label("best_time"),
            )
            .join(QuizAttempt, QuizAttempt.student_id == StudentProfile.id)
            .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
            .group_by(StudentProfile.id)
        )
        if grade:
            query = query.filter(StudentProfile.grade == grade)
        if subject:
            query = query.filter(Quiz.subject == subject)
        rows = query.all()

        ranked = sorted(
            rows,
            key=lambda item: (-float(item.best_score or 0), float(item.best_time or 999999)),
        )[:limit]
        total = len(ranked) or 1
        output: list[LeaderboardRow] = []
        for index, row in enumerate(ranked):
            student = db.get(StudentProfile, row.student_id)
            percentile = clamp_percent(((total - index) / total) * 100)
            output.append(
                LeaderboardRow(
                    rank=index + 1,
                    student_id=row.student_id,
                    name=student.user.full_name if student else "Student",
                    score=float(row.best_score or 0),
                    accuracy=clamp_percent(float(row.best_accuracy or 0)),
                    time_taken_seconds=int(row.best_time or 0),
                    percentile=percentile,
                    grade=student.grade if student else 0,
                    points=student.total_points if student else 0,
                    streak=student.streak_days if student else 0,
                )
            )
        return output

    def student_rank(self, db: Session, student_id: int, grade: int | None = None) -> tuple[int | None, float | None]:
        board = self.build(db, grade=grade, limit=500)
        for row in board:
            if row.student_id == student_id:
                return row.rank, row.percentile
        return None, None


leaderboard_service = LeaderboardService()
