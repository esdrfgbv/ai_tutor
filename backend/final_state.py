"""Final state check."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import app.models.models
import app.models.knowledge_models
from app.db.session import SessionLocal
from app.models.models import QuestionBank
from app.models.knowledge_models import KnowledgeDocument, KnowledgeChunk, KnowledgeEmbedding

db = SessionLocal()
try:
    print("=== Documents ===")
    for d in db.query(KnowledgeDocument).order_by(KnowledgeDocument.id).all():
        chunks = db.query(KnowledgeChunk).filter(KnowledgeChunk.document_id == d.id).count()
        print(f"  Doc {d.id}: {d.file_name} src={d.source_type} chunks={d.total_chunks}/{chunks} questions={d.total_questions or 0}")

    print(f"\nTotal QuestionBank: {db.query(QuestionBank).count()}")
    print(f"Total KnowledgeChunks: {db.query(KnowledgeChunk).count()}")
    print(f"Total KnowledgeEmbeddings: {db.query(KnowledgeEmbedding).count()}")
finally:
    db.close()
