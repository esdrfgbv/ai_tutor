from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_student_profile
from app.db.session import get_db
from app.models.models import Question, Quiz, StudentProfile, User
from app.schemas.schemas import AttemptIn  # reuse existing schema

router = APIRouter(prefix="/diagnostic", tags=["diagnostic"])


class DiagnosticStartIn(BaseModel):
    subject: str = Field(..., description="math | english | science | reasoning")


class DiagnosticQuestionOut(BaseModel):
    id: int
    prompt: str
    options: list | None = None
    difficulty: str | None = None

    class Config:
        from_attributes = True


class DiagnosticStartOut(BaseModel):
    quiz_id: int
    title: str
    subject: str
    grade: int
    duration_minutes: int
    questions: list[DiagnosticQuestionOut]


class DifficultyBreakdown(BaseModel):
    difficulty: str
    total: int
    correct: int


class DiagnosticSubmitOut(BaseModel):
    attempt_id: int
    quiz_id: int
    subject: str
    score: int
    total: int
    accuracy: float
    time_taken_seconds: int
    difficulty_breakdown: list[DifficultyBreakdown]
    recommendations: list[str]
    created_at: str


class DiagnosticHistoryItem(BaseModel):
    id: int
    quiz_id: int
    subject: str | None
    score: float
    total: int
    accuracy: float
    created_at: str | None

    class Config:
        from_attributes = True


@router.post("/start", response_model=DiagnosticStartOut)
def start_diagnostic(
    body: DiagnosticStartIn,
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    valid_subjects = {"math", "english", "science", "reasoning"}
    if body.subject not in valid_subjects:
        raise HTTPException(status_code=400, detail=f"Subject must be one of: {', '.join(sorted(valid_subjects))}")

    from app.services.diagnostic_service import diagnostic_service

    quiz = diagnostic_service.start_diagnostic(db, student, body.subject)

    return DiagnosticStartOut(
        quiz_id=quiz.id,
        title=quiz.title,
        subject=quiz.subject,
        grade=quiz.grade,
        duration_minutes=quiz.duration_minutes,
        questions=[
            DiagnosticQuestionOut(id=q.id, prompt=q.prompt, options=q.options, difficulty=q.difficulty.value if q.difficulty else None)
            for q in quiz.questions
        ],
    )


@router.post("/submit", response_model=DiagnosticSubmitOut)
def submit_diagnostic(
    body: AttemptIn,
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    quiz = db.get(Quiz, body.quiz_id)
    if not quiz or quiz.quiz_type != "diagnostic":
        raise HTTPException(status_code=404, detail="Diagnostic quiz not found")

    from app.services.diagnostic_service import diagnostic_service

    result = diagnostic_service.evaluate(db, student, body.quiz_id, body.answers, body.time_taken_seconds)

    return DiagnosticSubmitOut(**result)


@router.get("/results", response_model=list[DiagnosticHistoryItem])
def list_diagnostic_results(
    limit: int = Query(default=10, ge=1, le=50),
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    from app.services.diagnostic_service import diagnostic_service

    return diagnostic_service.get_history(db, student, limit)
