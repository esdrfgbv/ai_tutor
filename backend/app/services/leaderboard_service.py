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

    def admin_build(
        self,
        db: Session,
        page: int = 1,
        limit: int = 50,
        grade: int | None = None,
        subject: str | None = None,
        school_name: str | None = None,
        state: str | None = None,
        district: str | None = None,
        city: str | None = None,
        medium: str | None = None,
        section: str | None = None,
        sort_by: str = "highest_score",
    ) -> dict:
        from app.schemas.schemas import AdminLeaderboardRow, AdminLeaderboardResponse
        
        query = (
            db.query(
                StudentProfile.id.label("student_id"),
                func.max(QuizAttempt.score).label("best_score"),
                func.max(QuizAttempt.accuracy).label("best_accuracy"),
                func.count(QuizAttempt.id).label("quizzes_taken"),
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
        if school_name:
            query = query.filter(StudentProfile.normalized_school_name == school_name.lower().strip())
        if state:
            query = query.filter(StudentProfile.normalized_state == state.lower().strip())
        if district:
            query = query.filter(StudentProfile.district.ilike(f"%{district}%"))
        if city:
            query = query.filter(StudentProfile.city.ilike(f"%{city}%"))
        if medium:
            query = query.filter(StudentProfile.medium == medium)
        if section:
            query = query.filter(StudentProfile.section == section)

        rows = query.all()

        # Sort in-memory to compute percentiles and ranks properly
        if sort_by == "average_accuracy":
            key_func = lambda item: (-float(item.best_accuracy or 0), float(item.best_time or 999999))
        elif sort_by == "quizzes_taken":
            key_func = lambda item: (-int(item.quizzes_taken or 0), float(item.best_time or 999999))
        else: # highest_score
            key_func = lambda item: (-float(item.best_score or 0), float(item.best_time or 999999))

        ranked = sorted(rows, key=key_func)
        total_count = len(ranked)
        
        offset = (page - 1) * limit
        paginated = ranked[offset:offset + limit]

        output = []
        for index, row in enumerate(paginated):
            student = db.get(StudentProfile, row.student_id)
            # Rank is global index + 1
            global_rank = offset + index + 1
            percentile = clamp_percent(((total_count - global_rank + 1) / (total_count or 1)) * 100)
            
            output.append(
                AdminLeaderboardRow(
                    rank=global_rank,
                    student_id=row.student_id,
                    name=student.user.full_name if student else "Student",
                    school_name=student.school_name if student else "Unknown",
                    state=student.state if student else "Unknown",
                    district=student.district if student else "Unknown",
                    city=student.city if student else "Unknown",
                    section=student.section if student else "Unknown",
                    medium=student.medium if student else "Unknown",
                    score=float(row.best_score or 0),
                    accuracy=clamp_percent(float(row.best_accuracy or 0)),
                    quizzes_taken=int(row.quizzes_taken or 0),
                    time_taken_seconds=int(row.best_time or 0),
                    percentile=percentile,
                    grade=student.grade if student else 0,
                    points=student.total_points if student else 0,
                )
            )

        return {
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "data": output
        }


leaderboard_service = LeaderboardService()
