import sys
sys.path.insert(0, '.')

from app.main import app
from app.db.session import SessionLocal, engine, Base
from app.models.models import User, Chapter, Quiz, Question, QuizAttempt, ProgressTracking, StudySession
from app.core.config import get_settings

print("=" * 60)
print("BACKEND DIAGNOSTIC REPORT")
print("=" * 60)

# Check settings
settings = get_settings()
print(f"\n✓ App Name: {settings.app_name}")
print(f"✓ Environment: {settings.environment}")
print(f"✓ Database URL: {settings.database_url}")
print(f"✓ CORS Origins: {settings.cors_origins}")

# Check if tables can be created
try:
    Base.metadata.create_all(bind=engine)
    print("\n✓ Database schema creation successful")
except Exception as e:
    print(f"\n✗ Database error: {e}")
    sys.exit(1)

# Check database connection
try:
    db = SessionLocal()
    user_count = db.query(User).count()
    chapter_count = db.query(Chapter).count()
    quiz_count = db.query(Quiz).count()
    attempt_count = db.query(QuizAttempt).count()
    
    print(f"\n✓ Database connection successful")
    print(f"  - Users: {user_count}")
    print(f"  - Chapters: {chapter_count}")
    print(f"  - Quizzes: {quiz_count}")
    print(f"  - Quiz Attempts: {attempt_count}")
    
    db.close()
except Exception as e:
    print(f"\n✗ Database query error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Check FastAPI routes
print(f"\n✓ FastAPI routes registered:")
for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        print(f"  {route.methods} {route.path}")

print("\n" + "=" * 60)
print("END DIAGNOSTIC")
print("=" * 60)
