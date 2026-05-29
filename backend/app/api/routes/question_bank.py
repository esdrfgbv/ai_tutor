from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.db.session import get_db
from app.models.models import QuestionBank, QuestionBankSource, QuestionOption
from app.schemas.extraction_schemas import (
    QuestionBankListOut,
    SourceFilterOut,
    SectionFilterOut,
    YearFilterOut,
    RandomTestGenerateIn,
    QuestionBankItemOut
)
from app.schemas.schemas import QuizOut
from app.services.mock_test_service import mock_test_service

router = APIRouter(prefix="/admin/questions", tags=["admin", "question_bank"])

@router.get("", response_model=QuestionBankListOut)
def get_questions(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    subject: str | None = None,
    grade: int | None = None,
    chapter: str | None = None,
    section: str | None = None,
    source_pdf: str | None = None,
    source_id: int | None = None,
    year: int | None = None,
    difficulty: str | None = None,
    question_type: str | None = None,
    search: str | None = None,
    has_image: bool | None = None,
):
    query = db.query(QuestionBank).options(
        joinedload(QuestionBank.question_options),
        joinedload(QuestionBank.source)
    )
    
    if subject:
        query = query.filter(QuestionBank.subject == subject)
    if grade:
        query = query.filter(QuestionBank.grade == grade)
    if chapter:
        query = query.filter(QuestionBank.chapter.ilike(f"%{chapter}%"))
    if section:
        query = query.filter(QuestionBank.section_name == section)
    if source_id:
        query = query.filter(QuestionBank.source_id == source_id)
    elif source_pdf:
        query = query.filter(QuestionBank.source_pdf.ilike(f"%{source_pdf}%"))
    if year:
        query = query.filter(QuestionBank.year == year)
    if difficulty:
        query = query.filter(QuestionBank.difficulty == difficulty)
    if question_type:
        query = query.filter(QuestionBank.question_type == question_type)
    if search:
        query = query.filter(QuestionBank.prompt.ilike(f"%{search}%"))
    if has_image is not None:
        query = query.filter(QuestionBank.has_image == has_image)
        
    total = query.count()
    offset = (page - 1) * limit
    questions = query.order_by(QuestionBank.id.desc()).offset(offset).limit(limit).all()
    
    data = []
    for q in questions:
        item = {
            "id": q.id,
            "grade": q.grade,
            "subject": q.subject,
            "chapter": q.chapter,
            "section_name": q.section_name,
            "prompt": q.prompt,
            "options": q.options,
            "structured_options": [{"label": opt.label, "text": opt.text, "is_correct": opt.is_correct} for opt in q.question_options],
            "correct_answer": q.correct_answer,
            "difficulty": q.difficulty.value if q.difficulty else "medium",
            "marks": q.marks,
            "source_pdf": q.source.display_name if q.source else q.source_pdf,
            "source_page": q.source_page,
            "question_number": q.question_number,
            "year": q.year,
            "has_image": q.has_image,
            "tags": q.tags,
            "question_source_type": q.question_source_type.value if q.question_source_type else "manual"
        }
        data.append(item)
    
    return {
        "total_count": total,
        "page": page,
        "limit": limit,
        "data": data
    }


@router.get("/sources", response_model=list[SourceFilterOut])
def get_sources(db: Session = Depends(get_db)):
    sources = db.query(QuestionBankSource).filter(QuestionBankSource.total_questions_extracted > 0).all()
    return [
        {
            "id": s.id,
            "file_name": s.file_name,
            "display_name": s.display_name,
            "question_count": s.total_questions_extracted
        } for s in sources
    ]


@router.get("/sections", response_model=list[SectionFilterOut])
def get_sections(db: Session = Depends(get_db)):
    rows = db.query(QuestionBank.section_name, func.count(QuestionBank.id)).filter(
        QuestionBank.section_name.isnot(None)
    ).group_by(QuestionBank.section_name).all()
    
    return [{"section_name": row[0], "question_count": row[1]} for row in rows]


@router.get("/years", response_model=list[YearFilterOut])
def get_years(db: Session = Depends(get_db)):
    rows = db.query(QuestionBank.year, func.count(QuestionBank.id)).filter(
        QuestionBank.year.isnot(None)
    ).group_by(QuestionBank.year).order_by(QuestionBank.year.desc()).all()
    
    return [{"year": row[0], "question_count": row[1]} for row in rows]


@router.get("/{question_id}", response_model=QuestionBankItemOut)
def get_question(question_id: int, db: Session = Depends(get_db)):
    q = db.query(QuestionBank).options(
        joinedload(QuestionBank.question_options),
        joinedload(QuestionBank.source)
    ).filter(QuestionBank.id == question_id).first()
    
    if not q:
        raise HTTPException(404, "Question not found")
        
    return {
        "id": q.id,
        "grade": q.grade,
        "subject": q.subject,
        "chapter": q.chapter,
        "section_name": q.section_name,
        "prompt": q.prompt,
        "options": q.options,
        "structured_options": [{"label": opt.label, "text": opt.text, "is_correct": opt.is_correct} for opt in q.question_options],
        "correct_answer": q.correct_answer,
        "difficulty": q.difficulty.value if q.difficulty else "medium",
        "marks": q.marks,
        "source_pdf": q.source.display_name if q.source else q.source_pdf,
        "source_page": q.source_page,
        "question_number": q.question_number,
        "year": q.year,
        "has_image": q.has_image,
        "tags": q.tags,
        "question_source_type": q.question_source_type.value if q.question_source_type else "manual"
    }


@router.post("/random-set", response_model=QuizOut)
def generate_random_set(payload: RandomTestGenerateIn, db: Session = Depends(get_db)):
    """Generate a random test based on constraints."""
    # Simplified version - just fetch random questions based on total constraints for now
    # In a fully realized version, this would balance according to the subject_constraints array
    
    query = db.query(QuestionBank).filter(QuestionBank.grade == payload.grade)
    
    if payload.difficulty:
        query = query.filter(QuestionBank.difficulty == payload.difficulty)
    if payload.year:
        query = query.filter(QuestionBank.year == payload.year)
    if payload.source_ids:
        query = query.filter(QuestionBank.source_id.in_(payload.source_ids))
        
    # Fetch random questions
    questions = query.order_by(func.rand()).limit(payload.total_questions).all()
    
    if not questions:
        raise HTTPException(400, "No questions found matching criteria")
        
    # Map to format expected by mock_test_service
    mapped_questions = []
    for q in questions:
        mapped_questions.append({
            "prompt": q.prompt,
            "options": q.options,
            "correct_answer": q.correct_answer,
            "test_name": q.section_name or q.subject
        })
        
    quiz = mock_test_service.create_quiz_from_questions(
        db,
        title=payload.title,
        grade=payload.grade,
        subject=questions[0].subject if questions else "General",
        chapter=None,
        quiz_type="mock",
        duration_minutes=payload.duration_minutes,
        questions=mapped_questions,
        created_by_id=1,  # Hardcoded admin id for now
    )
    
    return quiz
