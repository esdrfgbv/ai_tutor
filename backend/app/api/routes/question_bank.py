from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.models import QuestionBank

router = APIRouter(prefix="/admin/questions", tags=["admin", "question_bank"])

@router.get("")
def get_questions(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    subject: str | None = None,
    grade: int | None = None,
    chapter: str | None = None,
):
    query = db.query(QuestionBank)
    if subject:
        query = query.filter(QuestionBank.subject == subject)
    if grade:
        query = query.filter(QuestionBank.grade == grade)
    if chapter:
        query = query.filter(QuestionBank.chapter.ilike(f"%{chapter}%"))
        
    total = query.count()
    offset = (page - 1) * limit
    questions = query.offset(offset).limit(limit).all()
    
    return {
        "total_count": total,
        "page": page,
        "limit": limit,
        "data": [
            {
                "id": q.id,
                "grade": q.grade,
                "subject": q.subject,
                "chapter": q.chapter,
                "prompt": q.prompt,
                "options": q.options,
                "correct_answer": q.correct_answer,
                "difficulty": q.difficulty.value if q.difficulty else "medium",
                "marks": q.marks,
            } for q in questions
        ]
    }
