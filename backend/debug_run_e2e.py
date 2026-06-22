"""
E2E test runner with debug output
"""
import sys
import json
import logging
from pathlib import Path
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler('e2e_debug.log', mode='w'),
        logging.StreamHandler(sys.stdout)
    ]
)

sys.path.insert(0, str(Path(__file__).parent))

from app.db.session import SessionLocal
from app.services.pdf_question_extractor import pdf_question_extractor
from app.models.models import QuestionBank, QuestionBankSource
from app.core.config import get_settings

settings = get_settings()

pdf_path = Path(__file__).resolve().parents[0].parent / "aiseee pyqs" / "aiseee 2023.pdf"
if not pdf_path.exists():
    print(f"ERROR: PDF not found at {pdf_path}")
    sys.exit(1)

print(f"PDF: {pdf_path}")
print(f"PDF size: {pdf_path.stat().st_size / 1024 / 1024:.2f} MB")
print(f"PaddleOCR available: {pdf_question_extractor.extract_from_pdf.__module__}")

from app.services.question_extraction.question_extraction_pipeline import question_extraction_pipeline
print(f"Pipeline available: {question_extraction_pipeline.available}")

db = SessionLocal()
try:
    # Clean up any previous failed source for this PDF
    existing = db.query(QuestionBankSource).filter(
        QuestionBankSource.file_path == str(pdf_path)
    ).first()
    if existing:
        print(f"\nFound existing source id={existing.id}, status={existing.extraction_status}")
        # Delete old questions
        old_qs = db.query(QuestionBank).filter(QuestionBank.source_id == existing.id).all()
        for q in old_qs:
            db.delete(q)
        db.delete(existing)
        db.commit()
        print("Cleaned up existing source")

    print("\n" + "=" * 80)
    print("STARTING EXTRACTION")
    print("=" * 80)

    start = datetime.now()
    result = pdf_question_extractor.extract_from_pdf(
        pdf_path, db,
        exam_type="AISSEE",
        year=2023,
        grade=6,
        display_name="AISSEE 2023"
    )
    elapsed = (datetime.now() - start).total_seconds()
    print(f"\nDuration: {elapsed:.1f}s")
    print(f"Status: {result.get('status')}")

    if result.get("status") == "completed":
        print(f"  Pages: {result.get('total_pages')}")
        print(f"  Questions found: {result.get('questions_found')}")
        print(f"  Questions inserted: {result.get('total_questions')}")
        print(f"  Questions rejected: {result.get('questions_rejected')}")
        print(f"  Duplicates: {result.get('duplicate_questions')}")

        # Verify in DB
        source_id = result.get("source_id")
        questions = db.query(QuestionBank).filter(
            QuestionBank.source_id == source_id
        ).order_by(QuestionBank.question_number).all()

        print(f"\nDATABASE: {len(questions)} questions for source_id={source_id}")
        for q in questions[:10]:
            opts = ", ".join([f"{o.label}){o.text[:30]}" for o in q.question_options])
            print(f"  Q{q.question_number}: {q.prompt[:60]}... | {opts} | Ans={q.correct_answer}")

        print("\n" + "=" * 80)
        print("SUCCESS")
        print("=" * 80)
    else:
        print(f"\nFAILED: {result.get('error')}")

        # Check debug artifacts
        debug_dir = Path(settings.upload_dir) / "pdf_sources" / "debug"
        if debug_dir.exists():
            for f in sorted(debug_dir.rglob("*")):
                if f.is_file():
                    print(f"  Debug artifact: {f.relative_to(Path(settings.upload_dir).parent)}")

except Exception as e:
    import traceback
    print(f"\nEXCEPTION: {e}")
    traceback.print_exc()
finally:
    db.close()

print("\nDone")
