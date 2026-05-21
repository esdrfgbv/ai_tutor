from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_student_profile
from app.models.models import StudentProfile
from app.schemas.schemas import StudySessionOut, StudySessionStartIn
from app.services.study_session_service import study_session_service

router = APIRouter(prefix="/study-sessions", tags=["study-sessions"])


@router.post("/start", response_model=StudySessionOut)
def start_session(
    payload: StudySessionStartIn,
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    return study_session_service.start_session(
        db,
        student_id=student.id,
        session_type=payload.session_type,
        subject=payload.subject,
        chapter=payload.chapter,
    )


@router.post("/{session_id}/heartbeat", response_model=StudySessionOut)
def send_heartbeat(
    session_id: int,
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    return study_session_service.send_heartbeat(db, student_id=student.id, session_id=session_id)


@router.post("/{session_id}/end", response_model=StudySessionOut)
def end_session(
    session_id: int,
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    return study_session_service.end_session(db, student_id=student.id, session_id=session_id)
