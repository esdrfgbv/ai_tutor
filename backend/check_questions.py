"""Check if question extraction actually ran for processed docs."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import app.models.models
import app.models.knowledge_models
from app.db.session import SessionLocal
from app.models.models import QuestionBank, QuestionBankSource
from app.models.knowledge_models import KnowledgeDocument, IngestionAuditLog

db = SessionLocal()
try:
    # All sources
    sources = db.query(QuestionBankSource).all()
    print("QuestionBankSource records:")
    for s in sources:
        q = db.query(QuestionBank).filter(QuestionBank.source_id == s.id).count()
        name = s.file_name or "N/A"
        display = s.display_name or "N/A"
        print(f"  Source {s.id}: {name} ({display}) -> {q} questions")

    # Audit logs for question extraction
    q_logs = db.query(IngestionAuditLog).filter(
        IngestionAuditLog.stage == "questions"
    ).all()
    print(f"\nQuestion extraction audit logs: {len(q_logs)}")
    for log in q_logs:
        print(f"  Doc {log.document_id}: action={log.action.value} details={log.details} error={log.error_message}")

    # Check if doc 17's source exists
    doc17 = db.get(KnowledgeDocument, 17)
    if doc17:
        fp = doc17.file_path
        print(f"\nDoc 17 file_path: {fp}")
        src = db.query(QuestionBankSource).filter(QuestionBankSource.file_path == fp).first()
        if src:
            print(f"Doc 17 has source {src.id}: {src.file_name} -> {db.query(QuestionBank).filter(QuestionBank.source_id == src.id).count()} questions")
        else:
            print("Doc 17 has NO QuestionBankSource")

    # Same for doc 22
    doc22 = db.get(KnowledgeDocument, 22)
    if doc22:
        fp = doc22.file_path
        src = db.query(QuestionBankSource).filter(QuestionBankSource.file_path == fp).first()
        if src:
            print(f"Doc 22 has source {src.id}: {src.file_name} -> {db.query(QuestionBank).filter(QuestionBank.source_id == src.id).count()} questions")
        else:
            print("Doc 22 has NO QuestionBankSource")

    total = db.query(QuestionBank).count()
    print(f"\nTotal QuestionBank: {total}")
finally:
    db.close()
