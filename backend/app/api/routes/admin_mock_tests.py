from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import AdminMockTest, AdminMockTestQuestionLink, AdminMockTestTarget

router = APIRouter(prefix="/admin/mock-tests", tags=["admin", "mock_tests"])

class TargetIn(BaseModel):
    target_type: str
    target_value: str

class MockTestCreateIn(BaseModel):
    title: str
    description: str | None = None
    duration_minutes: int
    total_marks: int
    negative_marking: float = 0.0
    start_time: datetime
    end_time: datetime
    instructions: str | None = None
    is_scheduled: bool = True
    question_ids: list[int]
    targets: list[TargetIn]

@router.post("")
def create_mock_test(payload: MockTestCreateIn, db: Session = Depends(get_db)):
    mock_test = AdminMockTest(
        title=payload.title,
        description=payload.description,
        duration_minutes=payload.duration_minutes,
        total_marks=payload.total_marks,
        negative_marking=payload.negative_marking,
        start_time=payload.start_time,
        end_time=payload.end_time,
        instructions=payload.instructions,
        is_scheduled=payload.is_scheduled,
        created_by_id=1 # Hardcode to 1 for now, in real app use current_user
    )
    db.add(mock_test)
    db.flush()
    
    for q_id in payload.question_ids:
        db.add(AdminMockTestQuestionLink(mock_test_id=mock_test.id, question_bank_id=q_id))
        
    for target in payload.targets:
        db.add(AdminMockTestTarget(mock_test_id=mock_test.id, target_type=target.target_type, target_value=target.target_value))
        
    db.commit()
    db.refresh(mock_test)
    return {"id": mock_test.id, "message": "Mock test created successfully"}


@router.get("")
def list_mock_tests(db: Session = Depends(get_db)):
    tests = db.query(AdminMockTest).order_by(AdminMockTest.created_at.desc()).all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "duration_minutes": t.duration_minutes,
            "start_time": t.start_time,
            "end_time": t.end_time,
            "is_scheduled": t.is_scheduled,
            "question_count": len(t.questions),
            "targets": [{"type": tg.target_type, "value": tg.target_value} for tg in t.targets]
        }
        for t in tests
    ]
