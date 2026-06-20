"""Reprocess failed/scanned documents through the pipeline."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import app.models.models  # noqa: F401
import app.models.knowledge_models  # noqa: F401

from app.services.knowledge.pipeline_orchestrator import pipeline_orchestrator

for doc_id in [13, 14, 15]:
    print(f"\n=== Reprocessing Doc {doc_id} ===")
    result = pipeline_orchestrator.reprocess_document(doc_id)
    status = result.get("status")
    chunks = result.get("total_chunks")
    pages = result.get("total_pages")
    error = result.get("error")
    print(f"  Result: {status} | chunks={chunks} | pages={pages}")
    if error:
        print(f"  ERROR: {error}")
