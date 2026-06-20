"""Reprocess doc 18 with table cleanup fix."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import app.models.models
import app.models.knowledge_models
from app.db.session import SessionLocal
from app.models.knowledge_models import KnowledgeDocument, ProcessingStatus
from app.services.knowledge.pipeline_orchestrator import pipeline_orchestrator

with SessionLocal() as db:
    d = db.get(KnowledgeDocument, 18)
    d.processing_status = ProcessingStatus.queued
    d.processing_error = None
    db.commit()

r = pipeline_orchestrator.process_document(18)
print(f"status={r.get('status')} chunks={r.get('total_chunks')}")
print(f"questions: {r.get('stages',{}).get('questions',{})}")
if r.get("error"):
    print(f"ERROR: {r['error']}")
