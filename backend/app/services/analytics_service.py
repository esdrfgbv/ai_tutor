"""
AnalyticsService — performance-optimised version with corrected analytics.

Key changes vs. original:
  1. recalculate_streak() removed from student_dashboard() GET handler.
     Streak is stored on the model and updated by the study-session service
     on session end — not on every dashboard read.

  2. QuizAttempt query uses joinedload(quiz, questions) to eliminate
     hundreds of lazy N+1 queries that caused the 39-second delay.

  3. student_rank() now uses the lightweight LeaderboardService.student_rank()
     subquery instead of rebuilding the full 500-row leaderboard.

  4. attempts capped at 200 for dashboard (trend only shows last 12 anyway).

  5. Chapter alias mapping merges duplicate topics (e.g. "Solid Shapes" and
     "Visualising Solid Shapes") using CHAPTER_ALIASES.

  6. Overall accuracy uses total_correct / total_questions across all attempts
     instead of averaging per-attempt accuracies.

  7. Topic accuracy uses total_correct / total_questions per canonical topic.

  8. Weak/Focus threshold corrected: < 60 % (was < 70 %).

  9. Abandoned / empty attempts (no questions) are excluded.

 10. A topic never appears in both strong and focus lists.
"""
import logging
from datetime import datetime, timedelta

from sqlalchemy import extract, func
from sqlalchemy.orm import Session, joinedload

from app.models.models import (
    ProgressTracking,
    Question,
    Quiz,
    QuizAttempt,
    StudentProfile,
    StudySession,
    User,
)
from app.schemas.schemas import DashboardStats
from app.services.leaderboard_service import clamp_percent, leaderboard_service
from app.services.study_session_service import MIN_MEANINGFUL_STUDY_SECONDS, study_session_service

logger = logging.getLogger(__name__)

# ── Chapter alias map ────────────────────────────────────────────────────
# Merges alternative names / partial names to a single canonical chapter.
CHAPTER_ALIASES: dict[str, str] = {
    "solid shapes": "Visualising Solid Shapes",
    "visualising solid shapes": "Visualising Solid Shapes",
    "solid shapes quiz 5": "Visualising Solid Shapes",
}

def _canonical_topic(topic: str) -> str:
    """Return the canonical chapter name for *topic*."""
    key = topic.strip().lower()
    return CHAPTER_ALIASES.get(key, topic)


class AnalyticsService:
    def student_dashboard(self, db: Session, student: StudentProfile) -> DashboardStats:
        # ── NOTE: streak is NOT recalculated here ─────────────────────────
        # Recalculation happens in study_session_service.end_session() and
        # expire_inactive_sessions(). Reading the stored value is instant.
        # Calling recalculate_streak() on every GET was issuing a DB COMMIT
        # on every dashboard load — an expensive write inside a read handler.
        # ─────────────────────────────────────────────────────────────────

        # Load attempts with quiz + questions eagerly to avoid N+1 lazy loads.
        # Limit to 200 most recent — the dashboard only visualises the last 12.
        attempts = (
            db.query(QuizAttempt)
            .options(
                joinedload(QuizAttempt.quiz).joinedload(Quiz.questions)
            )
            .filter(QuizAttempt.student_id == student.id)
            .order_by(QuizAttempt.created_at.desc())
            .limit(200)
            .all()
        )

        # ── Filter: only completed attempts with questions ──────────────────
        valid_attempts = [
            a for a in attempts
            if a.quiz and a.quiz.questions and len(a.quiz.questions) > 0
        ]
        logger.info("Analytics: loaded %d attempts total, %d valid (non-empty)",
                     len(attempts), len(valid_attempts))

        # ── Overall accuracy: total_correct / total_questions ───────────────
        overall_correct = 0
        overall_total = 0
        for a in valid_attempts:
            questions = a.quiz.questions
            answers = a.answers if isinstance(a.answers, dict) else {}
            if isinstance(a.answers, list):
                answers = {
                    str(q.id): ans
                    for q, ans in zip(questions, a.answers)
                }
            for q in questions:
                overall_total += 1
                submitted = str(answers.get(str(q.id), "")).strip().lower()
                expected = str(q.correct_answer).strip().lower()
                if submitted == expected:
                    overall_correct += 1

        avg_accuracy = (
            clamp_percent((overall_correct / overall_total) * 100)
            if overall_total
            else 0
        )
        logger.info("Analytics: overall accuracy = %d / %d = %.2f%%",
                     overall_correct, overall_total, avg_accuracy)

        # ── Study time ──────────────────────────────────────────────────────
        session_seconds = int(
            db.query(func.coalesce(func.sum(StudySession.duration_seconds), 0))
            .filter(StudySession.student_id == student.id)
            .scalar()
            or 0
        )
        progress_time = int(
            db.query(func.coalesce(func.sum(ProgressTracking.time_spent_minutes), 0))
            .filter(ProgressTracking.student_id == student.id)
            .scalar()
            or 0
        )
        study_minutes = progress_time + session_seconds // 60

        # ── Completion rate ─────────────────────────────────────────────────
        progress_rows = (
            db.query(ProgressTracking)
            .filter(ProgressTracking.student_id == student.id)
            .all()
        )
        completion = (
            clamp_percent(
                sum(p.completion_percentage for p in progress_rows) / len(progress_rows)
            )
            if progress_rows
            else 0
        )

        # ── Weekly consistency (meaningful study days in last 7 days) ───────
        seven_days_ago = datetime.utcnow().date() - timedelta(days=6)
        weekly_consistency = study_session_service.count_meaningful_days_since(
            db, student.id, seven_days_ago
        )

        # ── Active learning time by session type ────────────────────────────
        type_durations = (
            db.query(StudySession.session_type, func.sum(StudySession.duration_seconds))
            .filter(StudySession.student_id == student.id)
            .group_by(StudySession.session_type)
            .all()
        )
        active_learning_time = {
            stype: int((total_sec or 0) // 60) for stype, total_sec in type_durations
        }
        for stype in ["pdf_reading", "quiz", "mock_test"]:
            active_learning_time.setdefault(stype, 0)

        # ── Subject time distribution ───────────────────────────────────────
        subject_durations = (
            db.query(StudySession.subject, func.sum(StudySession.duration_seconds))
            .filter(StudySession.student_id == student.id)
            .group_by(StudySession.subject)
            .all()
        )
        subject_time_distribution = [
            {"subject": subject or "general", "minutes": int((total_sec or 0) // 60)}
            for subject, total_sec in subject_durations
        ]

        # ── Topic / subject analysis from attempts ──────────────────────────
        # All quiz + question data is already loaded eagerly — no lazy queries.
        topic_correct: dict[str, int] = {}
        topic_total: dict[str, int] = {}
        subject_correct: dict[str, int] = {}
        subject_total: dict[str, int] = {}
        mistake_topics: dict[str, int] = {}

        for attempt in valid_attempts:
            subject = attempt.quiz.subject if attempt.quiz else "general"
            questions = attempt.quiz.questions if attempt.quiz else []
            answers = attempt.answers if isinstance(attempt.answers, dict) else {}
            if isinstance(attempt.answers, list):
                answers = {
                    str(q.id): ans
                    for q, ans in zip(questions, attempt.answers)
                }

            for question in questions:
                submitted = str(answers.get(str(question.id), "")).strip().lower()
                expected = str(question.correct_answer).strip().lower()
                topic_raw = question.topic or subject
                topic = _canonical_topic(topic_raw)

                subject_correct.setdefault(subject, 0)
                subject_total.setdefault(subject, 0)
                topic_correct.setdefault(topic, 0)
                topic_total.setdefault(topic, 0)

                subject_total[subject] += 1
                topic_total[topic] += 1
                if submitted == expected:
                    subject_correct[subject] += 1
                    topic_correct[topic] += 1
                else:
                    mistake_topics[topic] = mistake_topics.get(topic, 0) + 1

        topic_mastery = [
            {
                "topic": topic,
                "accuracy": clamp_percent((topic_correct[topic] / topic_total[topic]) * 100),
                "attempts": topic_total[topic],
                "mastery": clamp_percent((topic_correct[topic] / topic_total[topic]) * 100),
            }
            for topic in topic_correct
        ]
        logger.info("Analytics: topic_mastery = %s",
                     [f"{t['topic']}: {t['accuracy']:.1f}%" for t in topic_mastery])

        # Strongest Topics: accuracy >= 80 %, descending
        # Focus Areas: accuracy < 60 %, ascending
        # A topic must NEVER appear in both lists
        strong_threshold = 80
        weak_threshold = 60

        strong_topics = sorted(
            [t for t in topic_mastery if t["accuracy"] >= strong_threshold],
            key=lambda x: x["accuracy"],
            reverse=True,
        )[:6]

        weak_topics = sorted(
            [t for t in topic_mastery if t["accuracy"] < weak_threshold],
            key=lambda x: x["accuracy"],
        )[:6]

        logger.info("Analytics: strong_topics = %s", [t["topic"] for t in strong_topics])
        logger.info("Analytics: weak_topics   = %s", [t["topic"] for t in weak_topics])

        subject_performance = [
            {
                "subject": subject,
                "accuracy": clamp_percent((subject_correct[subject] / subject_total[subject]) * 100),
                "attempts": subject_total[subject],
            }
            for subject in subject_correct
        ]

        trend = [
            {"date": a.created_at.strftime("%d %b"), "accuracy": clamp_percent(a.accuracy), "score": a.score}
            for a in reversed(attempts[:12])
        ]

        daily_progress = self._daily_progress(db, student)

        # ── Rank: lightweight subquery — does NOT rebuild the full board ─────
        rank, percentile = leaderboard_service.student_rank(db, student.id)

        recommendations = self.recommendations(avg_accuracy, weak_topics, completion)
        study_plan = self._study_plan(weak_topics, completion, student.grade)

        mock_test_summary = [
            {
                "quiz": attempt.quiz.title if attempt.quiz else "Quiz",
                "accuracy": clamp_percent(attempt.accuracy),
                "score": attempt.score,
                "time_taken_seconds": attempt.time_taken_seconds,
            }
            for attempt in attempts
            if attempt.quiz and attempt.quiz.quiz_type == "mock"
        ][:8]

        return DashboardStats(
            accuracy=avg_accuracy,
            quizzes_taken=len(attempts),
            study_minutes=study_minutes,
            completion_rate=completion,
            weak_topics=weak_topics,
            strong_topics=strong_topics,
            trend=trend,
            recommendations=recommendations,
            streak_days=student.streak_days,
            longest_streak=student.longest_streak,
            weekly_consistency=weekly_consistency,
            active_learning_time=active_learning_time,
            subject_time_distribution=subject_time_distribution,
            daily_progress=daily_progress,
            subject_performance=subject_performance,
            topic_mastery=topic_mastery[:12],
            leaderboard_rank=rank,
            leaderboard_percentile=percentile,
            study_plan=study_plan,
            mock_test_summary=mock_test_summary,
            active_days=len(
                {
                    row["date"]
                    for row in daily_progress
                    if row.get("minutes", 0) >= MIN_MEANINGFUL_STUDY_SECONDS // 60
                }
            ),
        )

    # ──────────────────────────────────────────────────────────────────────────

    def _daily_progress(self, db: Session, student: StudentProfile) -> list[dict]:
        today = datetime.utcnow().date()
        since = datetime.utcnow() - timedelta(days=13)
        sessions = (
            db.query(func.date(StudySession.started_at), func.sum(StudySession.duration_seconds))
            .filter(StudySession.student_id == student.id, StudySession.started_at >= since)
            .group_by(func.date(StudySession.started_at))
            .all()
        )
        attempts = (
            db.query(func.date(QuizAttempt.created_at), func.count(QuizAttempt.id))
            .filter(QuizAttempt.student_id == student.id, QuizAttempt.created_at >= since)
            .group_by(func.date(QuizAttempt.created_at))
            .all()
        )
        minutes_map = {str(day): int((total or 0) // 60) for day, total in sessions}
        quiz_map = {str(day): int(count or 0) for day, count in attempts}
        rows = []
        for offset in range(13, -1, -1):
            day = today - timedelta(days=offset)
            day_key = str(day)
            minutes = minutes_map.get(day_key, 0)
            rows.append(
                {
                    "date": day_key,
                    "minutes": minutes,
                    "hours": round(minutes / 60, 1),
                    "quizzes": quiz_map.get(day_key, 0),
                    "meaningful": minutes >= MIN_MEANINGFUL_STUDY_SECONDS // 60,
                }
            )
        return rows

    def recommendations(self, accuracy: float, weak_topics: list[dict], completion: float) -> list[str]:
        items = []
        if weak_topics:
            items.append(f"Revise {weak_topics[0]['topic']} with textbook examples, then take a short module quiz.")
        if accuracy < 75:
            items.append("Review incorrect answers from your last attempt before starting a new mock test.")
        if completion < 60:
            items.append("Complete one pending chapter module today to improve syllabus coverage.")
        return items or ["Maintain your streak with one timed mock test and one concept recap today."]

    def _study_plan(self, weak_topics: list[dict], completion: float, grade: int) -> list[str]:
        plan = [f"Continue Class {grade} module flow: read PDF → module quiz → next chapter."]
        if weak_topics:
            plan.append(f"Priority revision: {weak_topics[0]['topic']}.")
        if completion < 50:
            plan.append("Target 2 chapter modules this week to raise completion rate.")
        return plan

    # ──────────────────────────────────────────────────────────────────────────
    # Admin endpoints (unchanged from original logic)
    # ──────────────────────────────────────────────────────────────────────────

    def admin_overview(self, db: Session) -> dict:
        attempts = db.query(QuizAttempt).all()
        accuracies = [clamp_percent(a.accuracy) for a in attempts]
        avg_accuracy = round(sum(accuracies) / len(accuracies), 2) if accuracies else 0
        students = db.query(StudentProfile).count()
        seven_days_ago = datetime.utcnow().date() - timedelta(days=6)
        session_active_students = (
            db.query(StudySession.student_id)
            .filter(func.date(StudySession.started_at) >= seven_days_ago.strftime("%Y-%m-%d"))
            .distinct()
            .count()
        )
        active_students = session_active_students or (
            db.query(StudentProfile.id)
            .join(QuizAttempt, QuizAttempt.student_id == StudentProfile.id)
            .filter(QuizAttempt.created_at >= datetime.utcnow() - timedelta(days=7))
            .distinct()
            .count()
        )
        study_seconds_7d = int(
            db.query(func.coalesce(func.sum(StudySession.duration_seconds), 0))
            .filter(func.date(StudySession.started_at) >= seven_days_ago.strftime("%Y-%m-%d"))
            .scalar()
            or 0
        )
        subject_distribution = [
            {"subject": subject, "attempts": count}
            for subject, count in db.query(Quiz.subject, func.count(QuizAttempt.id))
            .join(QuizAttempt, QuizAttempt.quiz_id == Quiz.id)
            .group_by(Quiz.subject)
            .all()
        ]
        top_performers = leaderboard_service.build(db, limit=10)
        weak_students = sorted(accuracies)[:5] if accuracies else []
        return {
            "students": students,
            "quizzes": db.query(Quiz).count(),
            "questions": db.query(Question).count(),
            "attempts": len(attempts),
            "average_accuracy": avg_accuracy,
            "active_students_7d": active_students,
            "daily_active_users": active_students,
            "subject_distribution": subject_distribution,
            "top_performers": [row.model_dump() for row in top_performers],
            "weak_performing_accuracy_samples": weak_students,
            "chapter_completion_avg": clamp_percent(
                db.query(func.coalesce(func.avg(ProgressTracking.completion_percentage), 0)).scalar() or 0
            ),
            "engagement": {
                "study_sessions": db.query(StudySession).count(),
                "active_sessions": db.query(StudySession).filter(StudySession.active_status == True).count(),
                "study_hours_7d": round(study_seconds_7d / 3600, 1),
                "mock_attempts": db.query(QuizAttempt).join(Quiz).filter(Quiz.quiz_type == "mock").count(),
            },
        }

    def stakeholder_analytics(self, db: Session) -> dict:
        now = datetime.utcnow()
        today = now.date()

        dau_trend = []
        for offset in range(6, -1, -1):
            day = today - timedelta(days=offset)
            day_start = datetime(day.year, day.month, day.day)
            day_end = day_start + timedelta(hours=23, minutes=59, seconds=59)
            dau = (
                db.query(QuizAttempt.student_id)
                .filter(QuizAttempt.created_at >= day_start, QuizAttempt.created_at <= day_end)
                .distinct()
                .count()
            )
            dau_sessions = (
                db.query(StudySession.student_id)
                .filter(StudySession.started_at >= day_start, StudySession.started_at <= day_end)
                .distinct()
                .count()
            )
            dau_trend.append(
                {
                    "date": str(day),
                    "day": day.strftime("%a"),
                    "quiz_users": dau,
                    "session_users": dau_sessions,
                    "total_active": max(dau, dau_sessions),
                }
            )

        completion_by_grade = []
        for grade in range(6, 10):
            students_in_grade = db.query(StudentProfile).filter(StudentProfile.grade == grade).count()
            if students_in_grade == 0:
                continue
            avg_completion = (
                db.query(func.coalesce(func.avg(ProgressTracking.completion_percentage), 0))
                .join(StudentProfile, ProgressTracking.student_id == StudentProfile.id)
                .filter(StudentProfile.grade == grade)
                .scalar()
                or 0
            )
            avg_accuracy = (
                db.query(func.coalesce(func.avg(QuizAttempt.accuracy), 0))
                .join(StudentProfile, QuizAttempt.student_id == StudentProfile.id)
                .filter(StudentProfile.grade == grade)
                .scalar()
                or 0
            )
            completion_by_grade.append(
                {
                    "grade": grade,
                    "students": students_in_grade,
                    "avg_completion": clamp_percent(float(avg_completion)),
                    "avg_accuracy": clamp_percent(float(avg_accuracy)),
                }
            )

        subject_metrics = []
        for (subject,) in db.query(Quiz.subject).distinct().all():
            if not subject:
                continue
            attempts_count = db.query(QuizAttempt).join(Quiz).filter(Quiz.subject == subject).count()
            avg_acc = (
                db.query(func.coalesce(func.avg(QuizAttempt.accuracy), 0))
                .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
                .filter(Quiz.subject == subject)
                .scalar()
                or 0
            )
            subject_metrics.append(
                {
                    "subject": subject,
                    "attempts": attempts_count,
                    "avg_accuracy": clamp_percent(float(avg_acc)),
                }
            )

        hours_trend = []
        for offset in range(6, -1, -1):
            day = today - timedelta(days=offset)
            day_start = datetime(day.year, day.month, day.day)
            day_end = day_start + timedelta(hours=23, minutes=59, seconds=59)
            seconds = (
                db.query(func.coalesce(func.sum(StudySession.duration_seconds), 0))
                .filter(StudySession.started_at >= day_start, StudySession.started_at <= day_end)
                .scalar()
                or 0
            )
            hours_trend.append({"date": str(day), "day": day.strftime("%a"), "hours": round(seconds / 3600, 1)})

        student_growth = (
            db.query(
                extract("year", User.created_at).label("year"),
                extract("month", User.created_at).label("month"),
                func.count(User.id).label("count"),
            )
            .join(StudentProfile, User.id == StudentProfile.user_id)
            .group_by(extract("year", User.created_at), extract("month", User.created_at))
            .order_by(extract("year", User.created_at), extract("month", User.created_at))
            .all()
        )
        growth_trend = [
            {"month": f"{int(row.year)}-{int(row.month):02d}", "new_students": int(row.count)}
            for row in student_growth
        ]

        return {
            "dau_trend": dau_trend,
            "completion_by_grade": completion_by_grade,
            "subject_metrics": subject_metrics,
            "hours_trend": hours_trend,
            "student_growth": growth_trend,
            "total_students": db.query(StudentProfile).count(),
            "total_attempts": db.query(QuizAttempt).count(),
            "total_study_hours": round(
                (db.query(func.coalesce(func.sum(StudySession.duration_seconds), 0)).scalar() or 0) / 3600,
                1,
            ),
            "chapter_completion_avg": clamp_percent(
                db.query(func.coalesce(func.avg(ProgressTracking.completion_percentage), 0)).scalar() or 0
            ),
        }


analytics_service = AnalyticsService()
