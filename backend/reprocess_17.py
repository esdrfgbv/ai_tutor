"""Reprocess Doc 17 (PYQ)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import app.models.models  # noqa: F401
import app.models.knowledge_models  # noqa: F401

from app.db.session import SessionLocal, engine
from app.models.knowledge_models import KnowledgeDocument, KnowledgeChunk, KnowledgeEmbedding
from app.services.knowledge.pipeline_orchestrator import pipeline_orchestrator
from sqlalchemy import text

# Clean up any existing chunks/embeddings for doc 17
with engine.connect() as conn:
    conn.execute(
        text("DELETE ke FROM knowledge_embeddings ke INNER JOIN knowledge_chunks kc ON ke.chunk_id = kc.id WHERE kc.document_id = 17")
    )
    conn.execute(text("DELETE FROM knowledge_chunks WHERE document_id = 17"))
    conn.commit()
    print("Cleaned up doc 17")

result = pipeline_orchestrator.reprocess_document(17)
print(f"Doc 17: status={result.get('status')} chunks={result.get('total_chunks')} pages={result.get('total_pages')}")
if result.get("error"):
    print(f"  ERROR: {result['error']}")
