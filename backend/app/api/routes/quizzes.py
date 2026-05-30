from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_student_profile, require_roles
from app.db.session import get_db
from app.models.enums import Role
from app.models.models import Quiz, StudentProfile, User
from app.schemas.schemas import AttemptIn, AttemptOut, MockTestOut, ModuleOut, QuizGenerateIn, QuizOut, TimerSyncIn
from app.services.mock_test_service import mock_test_service
from app.services.quiz_service import quiz_service
from app.services.module_service import module_service

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

@router.get("/subjects")
def list_subjects():
    # Based on the folders we have: maths and science
    return ["maths", "science", "english", "mental-ability"]

@router.get("/subjects/{subject}/modules", response_model=list[ModuleOut])
def list_subject_modules(subject: str, user: User = Depends(require_roles(Role.student))):
    grade = user.student_profile.grade if user.student_profile else 9
    tests = mock_test_service.list_tests(subject, grade)
    return module_service.group_quizzes_by_module(subject, tests)


@router.get("", response_model=list[QuizOut])
def list_quizzes(grade: int | None = None, subject: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Quiz).options(selectinload(Quiz.questions)).filter(Quiz.is_published.is_(True))
    if grade:
        query = query.filter(Quiz.grade == grade)
    if subject:
        query = query.filter(Quiz.subject == subject)
    return query.order_by(Quiz.created_at.desc()).limit(50).all()


@router.get("/mock-tests", response_model=list[MockTestOut])
def list_mock_tests(subject: str, user: User = Depends(require_roles(Role.student))):
    grade = user.student_profile.grade if user.student_profile else 9
    return mock_test_service.list_tests(subject, grade)


@router.post("/module", response_model=QuizOut)
def create_module_quiz(
    payload: QuizGenerateIn,
    chapter_number: int,
    user: User = Depends(require_roles(Role.student)),
    db: Session = Depends(get_db),
):
    return quiz_service.create_module_quiz(db, payload, user.id, chapter_number)


@router.post("/mock", response_model=QuizOut)
def create_mock_quiz(
    payload: QuizGenerateIn,
    test_name: str,
    user: User = Depends(require_roles(Role.student)),
    db: Session = Depends(get_db),
):
    return quiz_service.create_mock_quiz(db, payload, user.id, test_name)


@router.get("/{quiz_id}", response_model=QuizOut)
def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).options(selectinload(Quiz.questions)).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


@router.post("/attempts", response_model=AttemptOut)
def submit_attempt(payload: AttemptIn, student: StudentProfile = Depends(get_student_profile), db: Session = Depends(get_db)):
    if not db.get(Quiz, payload.quiz_id):
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz_service.score_attempt(db, student, payload.quiz_id, payload.answers, payload.time_taken_seconds)


@router.post("/timer/sync")
def sync_timer(payload: TimerSyncIn, student: StudentProfile = Depends(get_student_profile), db: Session = Depends(get_db)):
    quiz_service.sync_timer(db, student, payload.quiz_id, payload.remaining_seconds)
    return {"status": "ok", "remaining_seconds": payload.remaining_seconds}


@router.get("/timer/{quiz_id}")
def get_timer(quiz_id: int, student: StudentProfile = Depends(get_student_profile), db: Session = Depends(get_db)):
    remaining = quiz_service.get_timer(db, student, quiz_id)
    return {"remaining_seconds": remaining}
