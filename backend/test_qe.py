"""Test PDFQuestionExtractor directly on doc 17."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

from app.services.pdf_question_extractor import PDFQuestionExtractor
import app.models.models
import app.models.knowledge_models
from app.db.session import SessionLocal
from app.models.models import QuestionBank, QuestionBankSource

fp = r"E:\uploads\knowledge\cc8d6c79d0ac42449a0fde965021d207.pdf"

db = SessionLocal()
try:
    # Clean old source
    src = db.query(QuestionBankSource).filter(QuestionBankSource.file_path == fp).first()
    if src:
        db.query(QuestionBank).filter(QuestionBank.source_id == src.id).delete()
        db.delete(src)
        db.commit()
        print("Cleaned old source")

    qe = PDFQuestionExtractor()
    result = qe.extract_from_pdf(
        fp, db,
        exam_type="AISSEE",
        year=2015,
        grade=6,
        display_name="aiseee 2015.pdf",
    )
    print(f"Extraction result: {result}")

    src2 = db.query(QuestionBankSource).filter(QuestionBankSource.file_path == fp).first()
    if src2:
        qs = db.query(QuestionBank).filter(QuestionBank.source_id == src2.id).count()
        print(f"Extracted {qs} questions")
    else:
        print("No source created!")
finally:
    db.close()
