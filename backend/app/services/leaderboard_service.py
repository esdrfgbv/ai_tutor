"""
LeaderboardService — optimised for performance.

Key changes vs. original:
  • build()         — single JOIN query includes User.full_name; no per-row db.get()
  • student_rank()  — lightweight single-student rank query; no full board build
  • admin_build()   — same JOIN optimisation; per-row db.get() removed
  • grouped_build() — top_student lookup uses a single subquery per group via
                      SQL aggregation instead of N individual queries
"""
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.models import Quiz, QuizAttempt, StudentProfile, User
from app.schemas.schemas import GroupedLeaderboardRow, LeaderboardRow


def clamp_percent(value: float) -> float:
    return round(max(0.0, min(100.0, value)), 2)


class LeaderboardService:
    # ------------------------------------------------------------------
    # PUBLIC: student-facing leaderboard (dashboard + /leaderboard page)
    # ------------------------------------------------------------------
    def build(
        self,
        db: Session,
        grade: int | None = None,
        subject: str | None = None,
        limit: int = 50,
    ) -> list[LeaderboardRow]:
        """
        Single aggregate query with a JOIN to users — no N+1.
        Returns up to `limit` ranked rows.
        """
        query = (
            db.query(
                StudentProfile.id.label("student_id"),
                User.full_name.label("full_name"),
                StudentProfile.grade.label("grade"),
                StudentProfile.total_points.label("total_points"),
                StudentProfile.streak_days.label("streak_days"),
                func.max(QuizAttempt.score).label("best_score"),
                func.max(QuizAttempt.accuracy).label("best_accuracy"),
                func.coalesce(
                    func.min(func.nullif(QuizAttempt.time_taken_seconds, 0)),
                    999999,
                ).label("best_time"),
            )
            .join(QuizAttempt, QuizAttempt.student_id == StudentProfile.id)
            .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
            .join(User, User.id == StudentProfile.user_id)
            .group_by(
                StudentProfile.id,
                User.full_name,
                StudentProfile.grade,
                StudentProfile.total_points,
                StudentProfile.streak_days,
            )
        )

        if grade:
            query = query.filter(StudentProfile.grade == grade)
        if subject:
            query = query.filter(Quiz.subject == subject)

        rows = query.all()

        ranked = sorted(
            rows,
            key=lambda r: (-float(r.best_score or 0), float(r.best_time or 999999)),
        )[:limit]

        total = len(ranked) or 1
        output: list[LeaderboardRow] = []
        for index, row in enumerate(ranked):
            percentile = clamp_percent(((total - index) / total) * 100)
            output.append(
                LeaderboardRow(
                    rank=index + 1,
                    student_id=row.student_id,
                    name=row.full_name or "Student",
                    score=float(row.best_score or 0),
                    accuracy=clamp_percent(float(row.best_accuracy or 0)),
                    time_taken_seconds=int(row.best_time or 0),
                    percentile=percentile,
                    grade=row.grade or 0,
                    points=row.total_points or 0,
                    streak=row.streak_days or 0,
                )
            )
        return output

    # ------------------------------------------------------------------
    # Lightweight rank lookup — does NOT rebuild the full board
    # ------------------------------------------------------------------
    def student_rank(
        self,
        db: Session,
        student_id: int,
        grade: int | None = None,
    ) -> tuple[int | None, float | None]:
        """
        Compute this student's rank with a single COUNT query (fast).
        rank  = number of students with a higher best_score + 1
        percentile = (students_below / total) * 100
        """
        # Sub-query: best score per student
        subq = (
            db.query(
                StudentProfile.id.label("sid"),
                func.max(QuizAttempt.score).label("best"),
            )
            .join(QuizAttempt, QuizAttempt.student_id == StudentProfile.id)
        )
        if grade:
            subq = subq.filter(StudentProfile.grade == grade)
        subq = subq.group_by(StudentProfile.id).subquery()

        # This student's best score
        my_row = db.query(subq.c.best).filter(subq.c.sid == student_id).scalar()
        if my_row is None:
            return None, None

        my_best = float(my_row)

        # Total students with quiz data
        total: int = db.query(func.count(subq.c.sid)).scalar() or 1

        # Students with a strictly HIGHER best score
        above: int = (
            db.query(func.count(subq.c.sid))
            .filter(subq.c.best > my_best)
            .scalar()
            or 0
        )

        rank = above + 1
        percentile = clamp_percent(((total - rank + 1) / total) * 100)
        return rank, percentile

    # ------------------------------------------------------------------
    # Admin: full leaderboard with filters (paginated)
    # ------------------------------------------------------------------
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
                User.full_name.label("full_name"),
                StudentProfile.school_name.label("school_name"),
                StudentProfile.state.label("state"),
                StudentProfile.district.label("district"),
                StudentProfile.city.label("city"),
                StudentProfile.section.label("section"),
                StudentProfile.medium.label("medium"),
                StudentProfile.grade.label("grade"),
                StudentProfile.total_points.label("total_points"),
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
            .join(User, User.id == StudentProfile.user_id)
            .group_by(
                StudentProfile.id,
                User.full_name,
                StudentProfile.school_name,
                StudentProfile.state,
                StudentProfile.district,
                StudentProfile.city,
                StudentProfile.section,
                StudentProfile.medium,
                StudentProfile.grade,
                StudentProfile.total_points,
            )
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

        # In-memory sort to compute global percentiles correctly
        if sort_by == "average_accuracy":
            key_func = lambda r: (-float(r.best_accuracy or 0), float(r.best_time or 999999))
        elif sort_by == "quizzes_taken":
            key_func = lambda r: (-int(r.quizzes_taken or 0), float(r.best_time or 999999))
        else:
            key_func = lambda r: (-float(r.best_score or 0), float(r.best_time or 999999))

        ranked = sorted(rows, key=key_func)
        total_count = len(ranked)

        offset = (page - 1) * limit
        paginated = ranked[offset : offset + limit]

        output = []
        for index, row in enumerate(paginated):
            global_rank = offset + index + 1
            percentile = clamp_percent(((total_count - global_rank + 1) / (total_count or 1)) * 100)
            output.append(
                AdminLeaderboardRow(
                    rank=global_rank,
                    student_id=row.student_id,
                    name=row.full_name or "Student",
                    school_name=row.school_name or "Unknown",
                    state=row.state or "Unknown",
                    district=row.district or "Unknown",
                    city=row.city or "Unknown",
                    section=row.section or "Unknown",
                    medium=row.medium or "Unknown",
                    score=float(row.best_score or 0),
                    accuracy=clamp_percent(float(row.best_accuracy or 0)),
                    quizzes_taken=int(row.quizzes_taken or 0),
                    time_taken_seconds=int(row.best_time or 0),
                    percentile=percentile,
                    grade=row.grade or 0,
                    points=row.total_points or 0,
                )
            )

        return {
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "data": output,
        }

    # ------------------------------------------------------------------
    # Admin: grouped leaderboard (by district / school / state)
    # ------------------------------------------------------------------
    def grouped_build(
        self,
        db: Session,
        group_by: str = "district",
        page: int = 1,
        limit: int = 50,
        grade: int | None = None,
        state: str | None = None,
    ) -> dict:
        if group_by == "school":
            group_col = StudentProfile.school_name
        elif group_by == "state":
            group_col = StudentProfile.state
        else:
            group_col = StudentProfile.district

        query = (
            db.query(
                group_col.label("group_name"),
                func.count(StudentProfile.id.distinct()).label("student_count"),
                func.avg(QuizAttempt.score).label("avg_score"),
                func.avg(QuizAttempt.accuracy).label("avg_accuracy"),
                func.count(QuizAttempt.id).label("total_quizzes"),
                func.max(QuizAttempt.score).label("top_score"),
            )
            .join(StudentProfile, QuizAttempt.student_id == StudentProfile.id)
        )

        if grade:
            query = query.filter(StudentProfile.grade == grade)
        if state:
            query = query.filter(
                StudentProfile.normalized_state == state.lower().strip()
            )

        rows = (
            query.group_by(group_col)
            .order_by(func.avg(QuizAttempt.score).desc())
            .all()
        )

        # Fetch top-student names for all groups in ONE query
        # Subquery: best score per student
        best_score_subq = (
            db.query(
                StudentProfile.id.label("sid"),
                group_col.label("grp"),
                func.max(QuizAttempt.score).label("best"),
            )
            .join(QuizAttempt, QuizAttempt.student_id == StudentProfile.id)
        )
        if grade:
            best_score_subq = best_score_subq.filter(StudentProfile.grade == grade)
        if state:
            best_score_subq = best_score_subq.filter(
                StudentProfile.normalized_state == state.lower().strip()
            )
        best_score_subq = best_score_subq.group_by(StudentProfile.id, group_col).subquery()

        # Top student per group: pick the student with the highest best_score per group
        top_per_group_subq = (
            db.query(
                best_score_subq.c.grp,
                func.max(best_score_subq.c.best).label("top_best"),
            )
            .group_by(best_score_subq.c.grp)
            .subquery()
        )

        # Join back to get student IDs
        top_sid_subq = (
            db.query(
                best_score_subq.c.grp,
                func.min(best_score_subq.c.sid).label("top_sid"),  # min to deterministically pick one
            )
            .join(
                top_per_group_subq,
                (best_score_subq.c.grp == top_per_group_subq.c.grp)
                & (best_score_subq.c.best == top_per_group_subq.c.top_best),
            )
            .group_by(best_score_subq.c.grp)
            .subquery()
        )

        # Bulk fetch names
        top_students = (
            db.query(
                top_sid_subq.c.grp,
                User.full_name,
            )
            .join(StudentProfile, StudentProfile.id == top_sid_subq.c.top_sid)
            .join(User, User.id == StudentProfile.user_id)
            .all()
        )
        top_name_map: dict[str, str] = {
            str(row.grp): row.full_name for row in top_students
        }

        ranked = sorted(rows, key=lambda r: -(r.avg_score or 0))
        total_count = len(ranked)
        offset = (page - 1) * limit
        paginated = ranked[offset : offset + limit]

        output = []
        for index, row in enumerate(paginated):
            grade_str = str(grade) if grade else None
            output.append(
                GroupedLeaderboardRow(
                    rank=offset + index + 1,
                    group_name=row.group_name or "Unknown",
                    student_count=int(row.student_count or 0),
                    avg_score=round(float(row.avg_score or 0), 2),
                    avg_accuracy=round(float(row.avg_accuracy or 0), 2),
                    total_quizzes=int(row.total_quizzes or 0),
                    top_student_name=top_name_map.get(str(row.group_name), "Unknown"),
                    top_student_score=round(float(row.top_score or 0), 2),
                    grade=grade_str,
                )
            )

        return {
            "group_by": group_by,
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "data": output,
        }


leaderboard_service = LeaderboardService()
