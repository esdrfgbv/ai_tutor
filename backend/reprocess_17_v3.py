"""Fix doc 17 and reprocess (process_document path)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import app.models.models
import app.models.knowledge_models
from app.db.session import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("UPDATE knowledge_documents SET processing_status='queued',processing_error=NULL,retry_count=0 WHERE id=17"))
    conn.commit()
print("Fixed doc 17 status")

from app.services.knowledge.pipeline_orchestrator import pipeline_orchestrator
r = pipeline_orchestrator.process_document(17)
print(f"Doc 17: status={r.get('status')} chunks={r.get('total_chunks')}")
print(f"questions stage: {r.get('stages',{}).get('questions',{})}")
if r.get("error"):
    print(f"ERROR: {r['error']}")
