#!/usr/bin/env python
"""
End-to-End Test: PDF Extraction Pipeline
Tests the complete flow from PDF upload to Question Bank retrieval
"""

import sys
import json
from pathlib import Path
from datetime import datetime

# Add backend to path
BACKEND_PATH = Path(__file__).resolve().parents[0] / "backend"
if str(BACKEND_PATH) not in sys.path:
    sys.path.insert(0, str(BACKEND_PATH))

from app.db.session import SessionLocal
from app.services.question_extraction.question_extraction_pipeline import question_extraction_pipeline
from app.models.models import QuestionBank, QuestionBankSource
from app.core.config import get_settings

def format_report(obj):
    """Format an object for reporting"""
    if isinstance(obj, dict):
        return json.dumps(obj, indent=2, default=str)
    return str(obj)

def main():
    print("=" * 100)
    print("PDF EXTRACTION END-TO-END TEST")
    print("=" * 100)
    
    settings = get_settings()
    pdf_path = Path(__file__).resolve().parents[0] / "aiseee pyqs" / "aiseee 2023.pdf"
    
    if not pdf_path.exists():
        print(f"❌ PDF not found: {pdf_path}")
        return
    
    print(f"\n📄 PDF File: {pdf_path.name}")
    print(f"📊 File Size: {pdf_path.stat().st_size / (1024*1024):.2f} MB")
    print(f"🔍 PaddleOCR Available: {question_extraction_pipeline.available}")
    
    db = SessionLocal()
    try:
        # Clear existing data for this file (optional)
        # existing = db.query(QuestionBankSource).filter(QBS.file_path == str(pdf_path)).first()
        # if existing:
        #     db.delete(existing)
        #     db.commit()
        
        print("\n" + "=" * 100)
        print("PHASE 1: DOCUMENT EXTRACTION")
        print("=" * 100)
        
        start_time = datetime.now()
        result = question_extraction_pipeline.process_pdf(
            pdf_path,
            db,
            exam_type="AISSEE",
            year=2023,
            grade=6,
            display_name="AISSEE 2023"
        )
        end_time = datetime.now()
        
        print(f"\n⏱️  Extraction Duration: {(end_time - start_time).total_seconds():.2f}s")
        print(f"📊 Status: {result.get('status')}")
        
        if result.get("status") == "failed":
            print(f"❌ Error: {result.get('error')}")
            return
        
        print(f"\n✅ EXTRACTION SUCCESSFUL")
        print(f"   Pages Processed: {result.get('total_pages')}")
        print(f"   Questions Found: {result.get('questions_found')}")
        print(f"   Questions Inserted: {result.get('total_questions')}")
        print(f"   Questions Rejected: {result.get('questions_rejected')}")
        print(f"   Duplicate Questions: {result.get('duplicate_questions')}")
        print(f"   Diagrams Found: {result.get('diagrams_found')}")
        print(f"   Tables Found: {result.get('tables_found')}")
        print(f"   Formulas Found: {result.get('formulas_found')}")
        
        # OCR Report
        ocr_report = result.get("ocr_report", {})
        print(f"\n📋 OCR REPORT:")
        print(f"   Engine: {ocr_report.get('engine')}")
        print(f"   OCR Duration: {ocr_report.get('ocr_duration_seconds')}s")
        print(f"   Pages Processed: {ocr_report.get('pages_processed')}")
        if ocr_report.get("errors"):
            print(f"   Errors: {ocr_report.get('errors')}")
        
        # Extraction Report
        extract_report = result.get("extraction_report", {})
        print(f"\n📋 EXTRACTION REPORT:")
        print(f"   Valid Questions: {extract_report.get('questions_valid')}")
        print(f"   Rejected Questions: {extract_report.get('questions_rejected')}")
        print(f"   Duplicate Questions: {extract_report.get('duplicate_questions')}")
        print(f"   Tables Found: {extract_report.get('tables_found')}")
        print(f"   Images Found: {extract_report.get('images_found')}")
        print(f"   Formulas Found: {extract_report.get('formulas_found')}")
        
        if extract_report.get("validation_failures"):
            print(f"\n⚠️  Sample Validation Failures (first 3):")
            for i, failure in enumerate(extract_report.get("validation_failures", [])[:3]):
                print(f"   {i+1}. Q.{failure.get('question_number')}: {failure.get('errors')}")
        
        source_id = result.get("source_id")
        
        print("\n" + "=" * 100)
        print("PHASE 2: DATABASE VERIFICATION")
        print("=" * 100)
        
        # Verify database insertion
        db_report = result.get("database_report", {})
        print(f"\n📊 DATABASE REPORT:")
        print(f"   Inserted Rows: {db_report.get('inserted_rows')}")
        print(f"   Failed Rows: {db_report.get('failed_rows')}")
        
        # Count questions in Question Bank
        source = db.query(QuestionBankSource).filter(QuestionBankSource.id == source_id).first()
        if source:
            questions = db.query(QuestionBank).filter(QuestionBank.source_id == source_id).all()
            print(f"\n✅ QUESTIONS IN DATABASE: {len(questions)}")
            
            if len(questions) > 0:
                # Show first 3 questions as samples
                print(f"\n📝 Sample Questions (first 3):")
                for i, q in enumerate(questions[:3]):
                    print(f"\n   {i+1}. Q.{q.question_number}: {q.prompt[:80]}...")
                    if q.question_options:
                        for opt in q.question_options:
                            marker = "✓" if opt.is_correct else " "
                            print(f"      [{marker}] {opt.label}. {opt.text[:60]}...")
                    print(f"      Section: {q.section_name}")
                    print(f"      Subject: {q.subject}")
                    print(f"      Grade: {q.grade}")
        
        print("\n" + "=" * 100)
        print("PHASE 3: QUESTION BANK API RETRIEVAL")
        print("=" * 100)
        
        # Retrieve via API-like query
        print(f"\n🔍 Querying Question Bank for source_id={source_id}...")
        questions = db.query(QuestionBank).filter(
            QuestionBank.source_id == source_id
        ).order_by(QuestionBank.question_number).limit(10).all()
        
        print(f"✅ Retrieved {len(questions)} questions from Question Bank\n")
        
        if questions:
            print("📋 QUESTION BANK SAMPLE (first 5):")
            for q in questions[:5]:
                print(f"\n   Q.{q.question_number} ({q.subject})")
                print(f"   Grade {q.grade} | {q.section_name}")
                print(f"   {q.prompt[:100]}...")
                options_text = ", ".join([opt.label for opt in q.question_options])
                print(f"   Options: {options_text}")
                print(f"   Answer: {q.correct_answer}")
        
        # Validation checks
        print("\n" + "=" * 100)
        print("VALIDATION CHECKS")
        print("=" * 100)
        
        checks_passed = 0
        checks_failed = 0
        
        checks = [
            ("PDF Upload", result.get("status") == "completed"),
            ("OCR Completed", result.get('total_pages', 0) > 0),
            ("Questions Extracted", result.get('questions_found', 0) > 0),
            ("Questions Inserted", result.get('total_questions', 0) > 0),
            ("Database Populated", len(questions) > 0),
            ("No Corrupted Questions", result.get('questions_rejected', 0) < result.get('questions_found', 0) / 2),
        ]
        
        for check_name, passed in checks:
            status = "✅" if passed else "❌"
            print(f"{status} {check_name}")
            if passed:
                checks_passed += 1
            else:
                checks_failed += 1
        
        print("\n" + "=" * 100)
        print(f"RESULT: {checks_passed}/{len(checks)} checks passed")
        print("=" * 100)
        
        if checks_failed == 0:
            print("\n🎉 SUCCESS! The PDF extraction pipeline is working end-to-end!")
        else:
            print(f"\n⚠️  {checks_failed} check(s) failed. Review the output above.")
        
    finally:
        db.close()

if __name__ == "__main__":
    main()
