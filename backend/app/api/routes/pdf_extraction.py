from pathlib import Path
import shutil

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import get_settings
from app.db.session import get_db
from app.models.models import QuestionBank, QuestionBankSource
from app.schemas.extraction_schemas import ExtractionJobOut, ExtractionStatsOut, LocalImportIn, PDFUploadIn
from app.services.pdf_question_extractor import import_pdfs_from_directory, pdf_question_extractor

router = APIRouter(prefix="/admin/pdf-extraction", tags=["admin", "pdf_extraction"])
settings = get_settings()


def run_extraction_background(source_id: int, pdf_path: str, exam_type: str | None, year: int | None, grade: int | None, display_name: str | None):
    db = next(get_db())
    try:
        pdf_question_extractor.extract_from_pdf(
            Path(pdf_path),
            db,
            exam_type=exam_type,
            year=year,
            grade=grade,
            display_name=display_name
        )
    finally:
        db.close()


@router.post("/upload", response_model=ExtractionJobOut)
def upload_and_extract(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    exam_type: str | None = None,
    year: int | None = None,
    grade: int | None = None,
    display_name: str | None = None,
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported")

    upload_dir = Path(settings.upload_dir) / "pdf_sources"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_dir / file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Initial DB record
    source = QuestionBankSource(
        file_path=str(file_path),
        file_name=file.filename,
        display_name=display_name or file.filename,
        exam_type=exam_type,
        year=year,
        grade=grade,
        extraction_status="pending"
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    background_tasks.add_task(
        run_extraction_background,
        source.id,
        str(file_path),
        exam_type,
        year,
        grade,
        display_name
    )

    return source


@router.post("/import-local")
def import_local_directory(
    payload: LocalImportIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    valid_dirs = {
        "mock_test_papers": settings.mock_test_papers_dir,
        "navodaya_pyqs": settings.navodaya_pyqs_dir,
        "aiseee_pyqs": settings.aiseee_pyqs_dir
    }
    
    if payload.directory not in valid_dirs:
        raise HTTPException(400, f"Invalid directory. Must be one of: {list(valid_dirs.keys())}")
        
    dir_path = valid_dirs[payload.directory]
    
    def run_batch_import():
        db_bg = next(get_db())
        try:
            import_pdfs_from_directory(db_bg, dir_path, exam_type=payload.exam_type, grade=payload.grade)
        finally:
            db_bg.close()
            
    background_tasks.add_task(run_batch_import)
    return {"message": f"Started batch import from {payload.directory} in the background"}


@router.get("/jobs", response_model=list[ExtractionJobOut])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(QuestionBankSource).order_by(QuestionBankSource.created_at.desc()).all()


@router.get("/jobs/{source_id}", response_model=ExtractionJobOut)
def get_job(source_id: int, db: Session = Depends(get_db)):
    job = db.query(QuestionBankSource).filter(QuestionBankSource.id == source_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.post("/jobs/{source_id}/reprocess")
def reprocess_job(source_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job = db.query(QuestionBankSource).filter(QuestionBankSource.id == source_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
        
    background_tasks.add_task(
        run_extraction_background,
        job.id,
        job.file_path,
        job.exam_type,
        job.year,
        job.grade,
        job.display_name
    )
    
    job.extraction_status = "pending"
    db.commit()
    
    return {"message": "Job queued for reprocessing"}


@router.get("/stats", response_model=ExtractionStatsOut)
def get_stats(db: Session = Depends(get_db)):
    total_sources = db.query(QuestionBankSource).count()
    completed = db.query(QuestionBankSource).filter(QuestionBankSource.extraction_status == "completed").count()
    failed = db.query(QuestionBankSource).filter(QuestionBankSource.extraction_status == "failed").count()
    pending = db.query(QuestionBankSource).filter(QuestionBankSource.extraction_status.in_(["pending", "processing"])).count()
    
    total_questions = db.query(QuestionBank).count()
    
    by_subject = {row[0]: row[1] for row in db.query(QuestionBank.subject, func.count(QuestionBank.id)).group_by(QuestionBank.subject).all() if row[0]}
    by_year = {str(row[0]): row[1] for row in db.query(QuestionBank.year, func.count(QuestionBank.id)).group_by(QuestionBank.year).all() if row[0]}
    by_section = {row[0]: row[1] for row in db.query(QuestionBank.section_name, func.count(QuestionBank.id)).group_by(QuestionBank.section_name).all() if row[0]}
    
    return {
        "total_sources": total_sources,
        "total_questions": total_questions,
        "completed_sources": completed,
        "failed_sources": failed,
        "pending_sources": pending,
        "questions_by_subject": by_subject,
        "questions_by_year": by_year,
        "questions_by_section": by_section
    }
