from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import ProgressTracking, Question, Quiz, QuizAttempt, StudentProfile, StudySession
from app.schemas.schemas import DashboardStats
from app.services.leaderboard_service import clamp_percent, leaderboard_service
from app.services.study_session_service import MIN_MEANINGFUL_STUDY_SECONDS, study_session_service


class AnalyticsService:
    def student_dashboard(self, db: Session, student: StudentProfile) -> DashboardStats:
        # Recalculate streak first to ensure freshness
        study_session_service.recalculate_streak(db, student)

        attempts = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.student_id == student.id)
            .order_by(QuizAttempt.created_at.desc())
            .all()
        )
        avg_accuracy = clamp_percent(sum(a.accuracy for a in attempts) / len(attempts)) if attempts else 0
        
        session_seconds = int(
            db.query(func.coalesce(func.sum(StudySession.duration_seconds), 0))
            .filter(StudySession.student_id == student.id)
            .scalar()
            or 0
        )
        study_minutes = int(
            db.query(func.coalesce(func.sum(ProgressTracking.time_spent_minutes), 0))
            .filter(ProgressTracking.student_id == student.id)
            .scalar()
            or 0
        )
        study_minutes += session_seconds // 60
        
        progress_rows = db.query(ProgressTracking).filter(ProgressTracking.student_id == student.id).all()
        completion = clamp_percent(sum(p.completion_percentage for p in progress_rows) / len(progress_rows)) if progress_rows else 0

        # Meaningful study days: at least 15 tracked minutes (from real session heartbeats)
        seven_days_ago = datetime.utcnow().date() - timedelta(days=6)
        weekly_consistency = study_session_service.count_meaningful_days_since(
            db, student.id, seven_days_ago
        )

        type_durations = (
            db.query(StudySession.session_type, func.sum(StudySession.duration_seconds))
            .filter(StudySession.student_id == student.id)
            .group_by(StudySession.session_type)
            .all()
        )
        active_learning_time = {
            stype: int((total_sec or 0) // 60)
            for stype, total_sec in type_durations
        }
        for stype in ["pdf_reading", "quiz", "mock_test"]:
            active_learning_time.setdefault(stype, 0)

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

        topic_scores: dict[str, list[float]] = {}
        subject_scores: dict[str, list[float]] = {}
        mistake_topics: dict[str, int] = {}
        for attempt in attempts:
            subject = attempt.quiz.subject if attempt.quiz else "general"
            subject_scores.setdefault(subject, []).append(attempt.accuracy)
            
            answers_dict = attempt.answers if isinstance(attempt.answers, dict) else {}
            if isinstance(attempt.answers, list):
                answers_dict = {str(q.id): ans for q, ans in zip((attempt.quiz.questions if attempt.quiz else []), attempt.answers)}
                
            for question in attempt.quiz.questions if attempt.quiz else []:
                submitted = str(answers_dict.get(str(question.id), "")).strip().lower()
                expected = str(question.correct_answer).strip().lower()
                topic = question.topic or subject
                topic_scores.setdefault(topic, []).append(100 if submitted == expected else 0)
                if submitted != expected:
                    mistake_topics[topic] = mistake_topics.get(topic, 0) + 1

        topic_mastery = [
            {
                "topic": topic,
                "accuracy": clamp_percent(sum(scores) / len(scores)),
                "attempts": len(scores),
                "mastery": clamp_percent(sum(scores) / len(scores)),
            }
            for topic, scores in topic_scores.items()
        ]
        topic_mastery.sort(key=lambda item: item["accuracy"])

        weak_topics = [item for item in topic_mastery if item["accuracy"] < 70][:6]
        strong_topics = [item for item in reversed(topic_mastery) if item["accuracy"] >= 80][:6]
        subject_performance = [
            {"subject": subject, "accuracy": clamp_percent(sum(scores) / len(scores)), "attempts": len(scores)}
            for subject, scores in subject_scores.items()
        ]
        trend = [
            {"date": a.created_at.strftime("%d %b"), "accuracy": clamp_percent(a.accuracy), "score": a.score}
            for a in reversed(attempts[:12])
        ]
        daily_progress = self._daily_progress(db, student)
        rank, percentile = leaderboard_service.student_rank(db, student.id, student.grade)
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


analytics_service = AnalyticsService()
