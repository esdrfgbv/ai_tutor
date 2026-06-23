import sys
sys.path.insert(0, ".")
from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    result = db.execute(text("SELECT setval('quizzes_id_seq', COALESCE((SELECT MAX(id) FROM quizzes), 1))"))
    print(f"Sequence reset to: {result.scalar()}")
    db.commit()
    print("Done - quizzes_id_seq reset successfully")
except Exception as e:
    print(f"Error: {e}")
    db.rollback()
finally:
    db.close()
