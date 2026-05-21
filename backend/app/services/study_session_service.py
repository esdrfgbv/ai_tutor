from datetime import date, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import StudentProfile, StudySession

MIN_MEANINGFUL_STUDY_SECONDS = 900  # 15 minutes — streak + consistency threshold
HEARTBEAT_INTERVAL_CAP_SECONDS = 40  # max credited gap between heartbeats
INACTIVE_SESSION_SECONDS = 90  # no heartbeat → auto-expire


class StudySessionService:
    @staticmethod
    def _parse_session_day(day_value) -> date | None:
        if day_value is None:
            return None
        if isinstance(day_value, date):
            return day_value
        if isinstance(day_value, datetime):
            return day_value.date()
        return datetime.strptime(str(day_value), "%Y-%m-%d").date()

    @staticmethod
    def _credit_elapsed(session: StudySession, now: datetime) -> None:
        elapsed = (now - session.last_heartbeat_at).total_seconds()
        if elapsed > 0:
            session.duration_seconds += int(min(elapsed, HEARTBEAT_INTERVAL_CAP_SECONDS))

    def _meaningful_active_dates(self, db: Session, student_id: int) -> set[date]:
        daily_durations = (
            db.query(func.date(StudySession.started_at), func.sum(StudySession.duration_seconds))
            .filter(StudySession.student_id == student_id)
            .group_by(func.date(StudySession.started_at))
            .all()
        )
        active_dates: set[date] = set()
        for day_value, total_sec in daily_durations:
            parsed = self._parse_session_day(day_value)
            if parsed and (total_sec or 0) >= MIN_MEANINGFUL_STUDY_SECONDS:
                active_dates.add(parsed)
        return active_dates

    def count_meaningful_days_since(self, db: Session, student_id: int, since: date) -> int:
        daily_durations = (
            db.query(func.date(StudySession.started_at), func.sum(StudySession.duration_seconds))
            .filter(
                StudySession.student_id == student_id,
                func.date(StudySession.started_at) >= since.strftime("%Y-%m-%d"),
            )
            .group_by(func.date(StudySession.started_at))
            .all()
        )
        return sum(
            1
            for day_value, total_sec in daily_durations
            if (total_sec or 0) >= MIN_MEANINGFUL_STUDY_SECONDS
        )

    def expire_inactive_sessions(self, db: Session) -> int:
        """
        Auto-expire sessions with no heartbeat for more than 90 seconds.
        Sets active_status to False and ended_at to the last_heartbeat_at.
        """
        threshold = datetime.utcnow() - timedelta(seconds=INACTIVE_SESSION_SECONDS)
        expired_sessions = (
            db.query(StudySession)
            .filter(StudySession.active_status == True, StudySession.last_heartbeat_at < threshold)
            .all()
        )
        if not expired_sessions:
            return 0

        affected_student_ids: set[int] = set()
        for session in expired_sessions:
            session.active_status = False
            session.ended_at = session.last_heartbeat_at
            affected_student_ids.add(session.student_id)

        db.commit()

        for student_id in affected_student_ids:
            student = db.get(StudentProfile, student_id)
            if student:
                self.recalculate_streak(db, student)

        return len(expired_sessions)

    def start_session(
        self,
        db: Session,
        student_id: int,
        session_type: str,
        subject: str | None = None,
        chapter: str | None = None,
    ) -> StudySession:
        """
        Starts a new study session, auto-expiring previous inactive ones,
        and cleanly ending any currently active sessions for the same student.
        """
        # 1. Clean up overall inactive sessions
        self.expire_inactive_sessions(db)

        # 2. Finalize any active sessions specifically for this student
        active_sessions = (
            db.query(StudySession)
            .filter(StudySession.student_id == student_id, StudySession.active_status == True)
            .all()
        )
        now = datetime.utcnow()
        for session in active_sessions:
            session.active_status = False
            self._credit_elapsed(session, now)
            session.ended_at = now

        if active_sessions:
            db.commit()
            student = db.get(StudentProfile, student_id)
            if student:
                self.recalculate_streak(db, student)

        # 3. Create the new session
        new_session = StudySession(
            student_id=student_id,
            session_type=session_type,
            subject=subject,
            chapter=chapter,
            started_at=now,
            ended_at=None,
            duration_seconds=0,
            active_status=True,
            last_heartbeat_at=now,
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        return new_session

    def send_heartbeat(self, db: Session, student_id: int, session_id: int) -> StudySession:
        """
        Processes a heartbeat for an active session, incrementing its duration
        based on elapsed time (up to 40 seconds).
        """
        self.expire_inactive_sessions(db)

        session = db.get(StudySession, session_id)
        if not session or session.student_id != student_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Study session not found or access denied.",
            )

        if not session.active_status:
            # If the session expired on the backend due to missed heartbeats,
            # we raise a 410 Gone error so the client knows it must start a new one.
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Study session has expired. Please start a new session.",
            )

        now = datetime.utcnow()
        self._credit_elapsed(session, now)
        session.last_heartbeat_at = now
        db.commit()
        db.refresh(session)
        return session

    def end_session(self, db: Session, student_id: int, session_id: int) -> StudySession:
        """
        Cleanly ends a study session and saves the total duration.
        """
        session = db.get(StudySession, session_id)
        if not session or session.student_id != student_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Study session not found or access denied.",
            )

        if session.active_status:
            now = datetime.utcnow()
            self._credit_elapsed(session, now)
            session.ended_at = now
            session.active_status = False
            db.commit()
            db.refresh(session)

        # Trigger streak recalculation on session end
        student = db.get(StudentProfile, student_id)
        if student:
            self.recalculate_streak(db, student)

        return session

    def recalculate_streak(self, db: Session, student: StudentProfile) -> None:
        """
        Calculates and updates current and longest streaks based on days
        where study time was at least 15 minutes (900 seconds).
        """
        active_dates = self._meaningful_active_dates(db, student.id)

        if not active_dates:
            student.streak_days = 0
            # longest_streak stays at its current database value
            db.commit()
            return

        today = datetime.utcnow().date()
        yesterday = today - timedelta(days=1)

        # Calculate current streak
        current_streak = 0
        if today in active_dates:
            check_date = today
            while check_date in active_dates:
                current_streak += 1
                check_date -= timedelta(days=1)
        elif yesterday in active_dates:
            check_date = yesterday
            while check_date in active_dates:
                current_streak += 1
                check_date -= timedelta(days=1)
        else:
            current_streak = 0

        # Calculate longest streak of all time
        sorted_dates = sorted(list(active_dates))
        temp_streak = 1
        longest_streak = 1
        for i in range(1, len(sorted_dates)):
            if (sorted_dates[i] - sorted_dates[i - 1]).days == 1:
                temp_streak += 1
            elif (sorted_dates[i] - sorted_dates[i - 1]).days > 1:
                temp_streak = 1
            longest_streak = max(longest_streak, temp_streak)

        student.streak_days = current_streak
        student.longest_streak = max(student.longest_streak, longest_streak)
        db.commit()


study_session_service = StudySessionService()
