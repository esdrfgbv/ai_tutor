"""Check current DB state."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import app.models.models
import app.models.knowledge_models
from app.db.session import SessionLocal
from app.models.models import QuestionBank, QuestionBankSource
from app.models.knowledge_models import KnowledgeEmbedding, KnowledgeChunk

db = SessionLocal()
try:
    print(f"Total QuestionBank: {db.query(QuestionBank).count()}")
    print(f"Total QuestionBankSource: {db.query(QuestionBankSource).count()}")
    for src in db.query(QuestionBankSource).all():
        qcount = db.query(QuestionBank).filter(QuestionBank.source_id == src.id).count()
        print(f"  Source {src.id}: file={src.file_name} questions={qcount}")
    print(f"Total KnowledgeChunks: {db.query(KnowledgeChunk).count()}")
    print(f"Total KnowledgeEmbeddings: {db.query(KnowledgeEmbedding).count()}")
finally:
    db.close()
