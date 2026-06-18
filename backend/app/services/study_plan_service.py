"""
Study Plan Service
- Generates structured weekly study plans (AI-powered or rule-based)
- Persists plans for retrieval
"""
import json
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.models import ProgressTracking, QuizAttempt, StudyPlan, StudySession


WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
SUBJECTS_BY_GRADE = {
    6: {"maths": "Mathematics", "english": "English", "science": "Science", "mental-ability": "Reasoning"},
    9: {"maths": "Mathematics", "english": "English", "science": "Science"},
}


class StudyPlanService:
    def generate(self, db: Session, student) -> StudyPlan:
        now = datetime.utcnow()
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=6, hours=23, minutes=59)

        existing = (
            db.query(StudyPlan)
            .filter(
                StudyPlan.student_id == student.id,
                StudyPlan.week_start == week_start,
                StudyPlan.is_active == True,
            )
            .first()
        )
        if existing:
            existing.is_active = False

        student_data = self._collect_student_data(db, student)
        plan_data = self._build_ai_plan(student_data)
        if not plan_data:
            plan_data = self._rule_plan(student_data)

        sp = StudyPlan(
            student_id=student.id,
            week_start=week_start,
            week_end=week_end,
            plan_data=plan_data,
            is_active=True,
            generated_by="ai" if plan_data.get("_generated_by") == "ai" else "rule",
        )
        if "_generated_by" in plan_data:
            del plan_data["_generated_by"]
        db.add(sp)
        db.commit()
        db.refresh(sp)
        return sp

    def get_active(self, db: Session, student) -> StudyPlan | None:
        now = datetime.utcnow()
        return (
            db.query(StudyPlan)
            .filter(
                StudyPlan.student_id == student.id,
                StudyPlan.is_active == True,
                StudyPlan.week_start <= now,
                StudyPlan.week_end >= now,
            )
            .first()
        )

    def get_history(self, db: Session, student, limit: int = 5) -> list[StudyPlan]:
        return (
            db.query(StudyPlan)
            .filter(StudyPlan.student_id == student.id)
            .order_by(StudyPlan.week_start.desc())
            .limit(limit)
            .all()
        )

    def _collect_student_data(self, db: Session, student) -> dict:
        attempts = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.student_id == student.id)
            .order_by(QuizAttempt.created_at.desc())
            .all()
        )
        avg_acc = sum(a.accuracy for a in attempts) / len(attempts) if attempts else 0

        progress_rows = (
            db.query(ProgressTracking)
            .filter(ProgressTracking.student_id == student.id)
            .all()
        )
        completion = (
            sum(p.completion_percentage for p in progress_rows) / len(progress_rows)
            if progress_rows
            else 0
        )

        weak = [
            {
                "subject": p.chapter.subject if p.chapter else "unknown",
                "topic": p.chapter.title if p.chapter else f"Chapter {p.chapter_id}",
                "mastery": p.mastery_score,
            }
            for p in progress_rows
            if p.mastery_score < 70
        ]

        subject_scores = {}
        for a in attempts:
            subj = a.quiz.subject if a.quiz else "unknown"
            if subj not in subject_scores:
                subject_scores[subj] = []
            subject_scores[subj].append(a.accuracy)

        subjects = SUBJECTS_BY_GRADE.get(student.grade, SUBJECTS_BY_GRADE[6])
        return {
            "grade": student.grade,
            "target_exam": student.target_exam,
            "avg_accuracy": avg_acc,
            "completion_rate": completion,
            "total_quizzes": len(attempts),
            "weak_topics": weak[:5],
            "subject_performance": {
                k: sum(v) / len(v) for k, v in subject_scores.items()
            },
            "subjects": subjects,
            "streak_days": student.streak_days,
            "total_points": student.total_points,
        }

    def _build_ai_plan(self, data: dict) -> dict | None:
        try:
            from app.services.ai_service import get_ai_provider

            weak_summary = "; ".join(
                f"{t['subject']}: {t['topic']} ({t['mastery']:.0f}%)"
                for t in data["weak_topics"]
            ) or "None — student is performing well."

            subj_perf = "; ".join(
                f"{k}: {v:.0f}%"
                for k, v in data["subject_performance"].items()
            ) or "No data yet."

            subjects_list = ", ".join(data["subjects"].values())

            prompt = f"""You are a JNV / Sainik exam coach creating a weekly study plan.

STUDENT PROFILE:
- Grade: {data['grade']} (target: {data['target_exam']})
- Subjects: {subjects_list}
- Overall accuracy: {data['avg_accuracy']:.0f}%
- Completion rate: {data['completion_rate']:.0f}%
- Weak areas: {weak_summary}
- Subject performance: {subj_perf}
- Streak: {data['streak_days']} days

Create a 7-day study plan (Monday to Sunday) as a JSON array of day objects.
Each day must have: "day" (string), "tasks" (array of {{"subject", "topic", "activity", "duration_minutes", "priority"}}).

Rules:
- Prioritize weak topics early in the week
- Mix subjects each day (don't do same subject all day)
- Include variety: "read PDF", "practice MCQs", "mock test", "revision", "PYQ practice"
- Total study time per day: 90-180 minutes for grade {data['grade']}
- Front-load harder topics on Monday-Wednesday
- Lighter days on weekends
- Return ONLY valid JSON array, no markdown, no explanation

Example task: {{"subject": "Mathematics", "topic": "Number System", "activity": "practice MCQs", "duration_minutes": 45, "priority": "high"}}"""

            provider = get_ai_provider()
            raw = provider.generate_text(prompt)

            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[-1]
                if "```" in raw:
                    raw = raw.rsplit("```", 1)[0]
            raw = raw.strip()

            plan = json.loads(raw)
            if isinstance(plan, list):
                plan = {"days": plan, "_generated_by": "ai"}
                return plan
        except Exception:
            pass
        return None

    def _rule_plan(self, data: dict) -> dict:
        days = []
        subjects = list(data["subjects"].keys())
        weak_topics = data.get("weak_topics", [])

        for i, day_name in enumerate(WEEKDAYS):
            tasks = []
            is_weekend = i >= 5
            total_minutes = 90 if is_weekend else 150

            subj_idx = 0
            while total_minutes > 30 and subj_idx < len(subjects) * 2:
                s = subjects[subj_idx % len(subjects)]
                remaining = min(45, total_minutes // (2 if not is_weekend else 1))
                if remaining < 20:
                    break

                matching_weak = [t for t in weak_topics if t["subject"] == s]
                topic = matching_weak[0]["topic"] if matching_weak else f"Chapter {((i + subj_idx) % 12) + 1}"

                if subj_idx < len(subjects):
                    activity = "read PDF"
                    priority = "high" if matching_weak else "medium"
                else:
                    activity = "practice MCQs"
                    priority = "medium"

                tasks.append({
                    "subject": data["subjects"].get(s, s),
                    "topic": topic,
                    "activity": activity,
                    "duration_minutes": remaining,
                    "priority": priority,
                })
                total_minutes -= remaining
                subj_idx += 1

            if tasks and i < 5:
                tasks.append({
                    "subject": "Mock Test",
                    "topic": "Full Syllabus",
                    "activity": "timed practice",
                    "duration_minutes": 30,
                    "priority": "medium",
                })

            days.append({"day": day_name, "tasks": tasks})

        return {"days": days, "_generated_by": "rule"}


study_plan_service = StudyPlanService()
