"""Reprocess remaining failed docs after FK fix."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import app.models.models  # noqa: F401
import app.models.knowledge_models  # noqa: F401

from app.db.session import SessionLocal, engine
from app.models.knowledge_models import KnowledgeDocument, KnowledgeChunk, KnowledgeEmbedding, ProcessingJob
from app.models.enums import ProcessingStatus, JobStatus
from app.services.knowledge.pipeline_orchestrator import pipeline_orchestrator
from datetime import datetime
from sqlalchemy import text

# First, manually clean up orphaned FK references for docs 13 & 14
with engine.connect() as conn:
    for doc_id in [13, 14]:
        # Delete embeddings that reference chunks from this doc
        conn.execute(
            text("""
                DELETE ke FROM knowledge_embeddings ke
                INNER JOIN knowledge_chunks kc ON ke.chunk_id = kc.id
                WHERE kc.document_id = :doc_id
            """),
            {"doc_id": doc_id}
        )
        # Now safe to delete chunks
        conn.execute(
            text("DELETE FROM knowledge_chunks WHERE document_id = :doc_id"),
            {"doc_id": doc_id}
        )
        conn.commit()
        print(f"Cleaned up doc {doc_id}")

# Now reprocess
for doc_id in [13, 14]:
    print(f"\n=== Reprocessing Doc {doc_id} ===")
    result = pipeline_orchestrator.reprocess_document(doc_id)
    status = result.get("status")
    chunks = result.get("total_chunks")
    pages = result.get("total_pages")
    error = result.get("error")
    print(f"  Result: {status} | chunks={chunks} | pages={pages}")
    if error:
        print(f"  ERROR: {error}")
