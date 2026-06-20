"""Reprocess doc 17 with chunk-based question extraction."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import app.models.models
import app.models.knowledge_models
from app.services.knowledge.pipeline_orchestrator import pipeline_orchestrator

r = pipeline_orchestrator.reprocess_document(17)
print(f"Doc 17: status={r.get('status')} chunks={r.get('total_chunks')}")
stages = r.get("stages", {})
print(f"questions stage: {stages.get('questions', {})}")
print(f"error: {r.get('error')}")
