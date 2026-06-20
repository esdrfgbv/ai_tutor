"""Reprocess docs 13-16, 18 to extract questions via new chunk-based pipeline."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import app.models.models
import app.models.knowledge_models
from app.db.session import SessionLocal
from app.models.knowledge_models import KnowledgeDocument, ProcessingStatus
from app.services.knowledge.pipeline_orchestrator import pipeline_orchestrator
from sqlalchemy import text

docs = [13, 14, 15, 16, 18]
for did in docs:
    print(f"\n--- Doc {did} ---")
    # Reset status
    with SessionLocal() as db:
        d = db.get(KnowledgeDocument, did)
        if not d:
            print(f"Doc {did} not found")
            continue
        d.processing_status = ProcessingStatus.queued
        d.processing_error = None
        db.commit()
    # Process
    r = pipeline_orchestrator.process_document(did)
    print(f"Result: status={r.get('status')} chunks={r.get('total_chunks')}")
    qs = r.get("stages", {}).get("questions", {})
    print(f"Questions: {qs}")
    if r.get("error"):
        print(f"ERROR: {r['error']}")
