from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_student_profile
from app.core.config import get_settings
from app.db.session import get_db
from app.models.models import (
    Chapter,
    ProgressTracking,
    StudentProfile,
    User,
)
from app.schemas.schemas import (
    ChapterOut,
    DoubtRequest,
    DoubtResponse,
)
from app.services.rag_service import rag_service

router = APIRouter(
    prefix="/learning",
    tags=["learning"],
)


@router.get(
    "/chapters",
    response_model=list[ChapterOut],
)
def list_chapters(
    grade: int | None = None,
    subject: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Chapter)

    if grade:
        query = query.filter(Chapter.grade == grade)

    if subject:
        query = query.filter(Chapter.subject == subject)

    return query.order_by(
        Chapter.grade,
        Chapter.subject,
        Chapter.chapter_number,
    ).all()


@router.get("/class-9-maths/pdf/{pdf_slug}")
def get_class_9_maths_pdf(pdf_slug: str):
    pdf_map = {
        "nsao": "chapter-1-nsao.pdf",
        "quadrilaterals": "chapter-2-quadrilaterals.pdf",
        "statistics": "chapter-3-statistics.pdf",
        "trigonometry": "chapter-4-trigonometry.pdf",
        "square-and-square-roots": "chapter-5-square-and-square-roots.pdf",
        "cube-and-cube-roots": "chapter-6-cube-and-cube-roots.pdf",
        "comparing-quantities": "chapter-7-comparing-quantities.pdf",
        "algebraic-expression-identities": "chapter-8-algebraic-expression-identities.pdf",
        "solid-shapes": "chapter-9-solid-shapes.pdf",
        "mensuration": "chapter-10-mensuration.pdf",
        "exponents": "chapter-11-exponents.pdf",
        "direct-inverse-proportional": "chapter-12-direct-inverse-proportional.pdf",
        "factorization": "chapter-13-factorization.pdf",
        "rational-numbers": "chapter-14-rational-numbers.pdf",
        "linear-equations-in-one-variable": "chapter-15-linear-equations-in-one-variable.pdf",
        "percentage-profit-and-loss": "chapter-16-percentage-profit-and-loss.pdf",
        "algebra": "chapter-17-algebra.pdf",
        "geometry": "chapter-18-geometry.pdf",
    }

    pdf_name = pdf_map.get(pdf_slug)

    if not pdf_name:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF not found",
        )

    pdf_dir = get_settings().source_root / "class_9" / "maths"

    file_path = pdf_dir / pdf_name

    print("SOURCE ROOT:", get_settings().source_root)
    print("PDF DIR:", pdf_dir)
    print("PDF NAME:", pdf_name)
    print("FULL PATH:", file_path)
    print("EXISTS:", file_path.exists())

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF not available",
        )

    with open(file_path, "rb") as pdf_file:
        pdf_bytes = pdf_file.read()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "inline"
        },
    )


@router.get("/profile")
def get_student_profile_info(
    student: StudentProfile = Depends(get_student_profile),
):
    return {
        "id": student.id,
        "grade": student.grade,
        "target_exam": student.target_exam,
    }


@router.get(
    "/chapters/{chapter_id}",
    response_model=ChapterOut,
)
def get_chapter(
    chapter_id: int,
    db: Session = Depends(get_db),
):
    chapter = db.get(Chapter, chapter_id)

    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found",
        )

    return chapter


@router.post(
    "/doubts",
    response_model=DoubtResponse,
)
def solve_doubt(
    payload: DoubtRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return rag_service.answer_doubt(
        db,
        user,
        payload,
    )


@router.post("/progress/{chapter_id}")
def update_progress(
    chapter_id: int,
    completion: float,
    minutes: int = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    student = user.student_profile

    progress = (
        db.query(ProgressTracking)
        .filter_by(
            student_id=student.id,
            chapter_id=chapter_id,
        )
        .first()
    )

    if not progress:
        progress = ProgressTracking(
            student_id=student.id,
            chapter_id=chapter_id,
        )

        db.add(progress)

    progress.completion_percentage = max(
        progress.completion_percentage,
        min(100, completion),
    )

    progress.time_spent_minutes += max(0, minutes)

    progress.mastery_score = max(
        progress.mastery_score,
        progress.completion_percentage,
    )

    db.commit()

    return {"status": "updated"}