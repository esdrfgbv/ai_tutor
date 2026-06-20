"""Check doc 17 pipeline result."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import app.models.models
import app.models.knowledge_models
from app.db.session import SessionLocal
from app.models.knowledge_models import KnowledgeDocument, ProcessingJob

db = SessionLocal()
try:
    d = db.get(KnowledgeDocument, 17)
    print(f"Doc 17: exists={os.path.exists(d.file_path)} path={d.file_path}")
    j = db.query(ProcessingJob).filter(ProcessingJob.document_id == 17).order_by(ProcessingJob.id.desc()).first()
    if j:
        print(f"Job: status={j.status} stage={j.current_stage} progress={j.progress_pct}")
        print(f"Error: {j.error_message[:300] if j.error_message else None}")
        print(f"Result: {str(j.result_summary)[:800] if j.result_summary else None}")
    else:
        print("No job found")
finally:
    db.close()
