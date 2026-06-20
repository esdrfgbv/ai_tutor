"""Fix stuck documents and check DB state."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import app.models.models  # noqa: F401 — ensure FK tables load
import app.models.knowledge_models  # noqa: F401

from app.db.session import SessionLocal, engine
from app.models.knowledge_models import KnowledgeDocument, KnowledgeChunk, ProcessingJob
from app.models.enums import ProcessingStatus, JobStatus, SourceType
from datetime import datetime, timezone
from sqlalchemy import text

db = SessionLocal()
try:
    # 1. Fix Doc 22 stuck at 'extracting' even though job completed
    with engine.connect() as conn:
        conn.execute(
            text("UPDATE knowledge_documents SET processing_status = 'completed', processing_completed_at = NOW() WHERE id = 22")
        )
        conn.commit()
    print("Fixed Doc 22: status -> completed")

    # 2. Check all docs
    docs = db.query(KnowledgeDocument).order_by(KnowledgeDocument.id).all()
    print(f"\n{'ID':>3}  {'Status':<15} {'Source':<15}  {'File'}")
    print("-" * 70)
    for d in docs:
        source = d.source_type.value if d.source_type else "NONE"
        print(f"{d.id:>3}  {d.processing_status.value:<15} {source:<15}  {d.original_file_name[:50]}")

    # 3. Question counts
    from app.models.models import QuestionBank
    total_qs = db.query(QuestionBank).count()
    print(f"\nTotal questions in QuestionBank: {total_qs}")

    # 4. Chunk counts per doc
    for d in docs:
        chunk_count = db.query(KnowledgeChunk).filter(KnowledgeChunk.document_id == d.id).count()
        print(f"  Doc {d.id}: {chunk_count} chunks")

finally:
    db.close()
