from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy import inspect, text

from app.api.routes import admin, analytics, auth, diagnostic, leaderboard, learning, parents, quizzes
from app.api.routes.ai_proxy import router as ai_proxy_router
from app.api.routes.study_plan import router as study_plan_router
from app.api.routes.admin_mock_tests import router as admin_mock_tests_router
from app.api.routes.question_bank import router as question_bank_router
from app.api.routes.pdf_extraction import router as pdf_extraction_router
from app.api.routes.conversations import router as conversations_router
from app.api.routes.notes import router as notes_router
from app.api.routes.bookmarks import router as bookmarks_router
from app.api.routes.study_sessions import router as study_sessions_router
from app.core.config import get_settings
from app.core.logging import LoggingMiddleware, get_logger
from app.core.security import hash_password

# Import knowledge models so tables are created by create_all()
import app.models.knowledge_models  # noqa: F401
from app.db.session import Base, SessionLocal, engine
from app.models.enums import Role
from app.models.models import Chapter, User

logger = get_logger(__name__)


def _ensure_student_schema() -> None:
    inspector = inspect(engine)
    if "students" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("students")}
    statements = []

    if "school_name" not in existing_columns:
        statements.append("ADD COLUMN school_name VARCHAR(220) NOT NULL DEFAULT 'Unknown'")
    if "school_code" not in existing_columns:
        statements.append("ADD COLUMN school_code VARCHAR(80) NULL")
    if "state" not in existing_columns:
        statements.append("ADD COLUMN state VARCHAR(80) NOT NULL DEFAULT 'Unknown'")
    if "district" not in existing_columns:
        statements.append("ADD COLUMN district VARCHAR(80) NOT NULL DEFAULT 'Unknown'")
    if "city" not in existing_columns:
        statements.append("ADD COLUMN city VARCHAR(80) NOT NULL DEFAULT 'Unknown'")
    if "section" not in existing_columns:
        statements.append("ADD COLUMN section VARCHAR(20) NOT NULL DEFAULT 'A'")
    if "medium" not in existing_columns:
        statements.append("ADD COLUMN medium VARCHAR(50) NOT NULL DEFAULT 'English'")
    if "academic_year" not in existing_columns:
        statements.append("ADD COLUMN academic_year VARCHAR(20) NOT NULL DEFAULT '2026-2027'")
    if "normalized_school_name" not in existing_columns:
        statements.append("ADD COLUMN normalized_school_name VARCHAR(220) NOT NULL DEFAULT 'unknown'")
    if "normalized_state" not in existing_columns:
        statements.append("ADD COLUMN normalized_state VARCHAR(80) NOT NULL DEFAULT 'unknown'")

    if not statements:
        return

    logger.info("Repairing students table schema: adding missing columns %s", statements)
    with engine.begin() as connection:
        connection.execute(text(f"ALTER TABLE students {', '.join(statements)}"))

        if "normalized_school_name" not in existing_columns:
            connection.execute(text(
                "CREATE INDEX ix_students_normalized_school_name ON students(normalized_school_name)"
            ))
        if "normalized_state" not in existing_columns:
            connection.execute(text(
                "CREATE INDEX ix_students_normalized_state ON students(normalized_state)"
            ))


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="1.0.0")
    
    # ============================================================================
    # MIDDLEWARE STACK (Execution order is REVERSE of add_middleware calls)
    # ============================================================================
    # IMPORTANT: Middleware executes in REVERSE order of add_middleware() calls.
    # The LAST middleware added is the FIRST to execute (outermost).
    # ============================================================================
    
    # Add LoggingMiddleware last so it executes LAST (innermost)
    app.add_middleware(LoggingMiddleware)
    
    # Add CORSMiddleware second-to-last so it executes FIRST (outermost)
    # This is CRITICAL: CORSMiddleware must intercept OPTIONS requests BEFORE
    # any other middleware or route handlers see them.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    logger.info(
        f"CORS Middleware initialized with origins: {settings.cors_origins}"
    )
    
    # Exception handlers
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request, exc):
        logger.warning(f"Validation error on {request.url.path}: {exc}")
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors()},
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request, exc):
        logger.error(f"Unhandled exception on {request.url.path}: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )
    app.include_router(auth.router, prefix="/api")
    app.include_router(learning.router, prefix="/api")
    app.include_router(quizzes.router, prefix="/api")
    app.include_router(analytics.router, prefix="/api")
    app.include_router(parents.router, prefix="/api")
    app.include_router(admin.router, prefix="/api")
    app.include_router(leaderboard.router, prefix="/api")
    app.include_router(question_bank_router, prefix="/api")
    app.include_router(admin_mock_tests_router, prefix="/api")
    app.include_router(pdf_extraction_router, prefix="/api")
    app.include_router(conversations_router, prefix="/api")
    app.include_router(diagnostic.router, prefix="/api")
    app.include_router(notes_router, prefix="/api")
    app.include_router(bookmarks_router, prefix="/api")
    app.include_router(study_plan_router, prefix="/api")
    app.include_router(study_sessions_router, prefix="/api")
    app.include_router(ai_proxy_router, prefix="/api")

    # Knowledge Base routes (lazy import to avoid circular deps at startup)
    from app.api.routes.knowledge_base import router as knowledge_base_router
    app.include_router(knowledge_base_router, prefix="/api")

    @app.on_event("startup")
    def bootstrap() -> None:
        # ====================================================================
        # CORS DIAGNOSTIC LOGGING
        # ====================================================================
        logger.info("=" * 80)
        logger.info("CORS CONFIGURATION AT STARTUP")
        logger.info("=" * 80)
        logger.info(f"Environment: {settings.environment}")
        logger.info(f"CORS Origins Raw (from config): {settings.cors_origins_raw}")
        logger.info(f"CORS Origins Parsed: {settings.cors_origins}")
        logger.info(f"Number of allowed origins: {len(settings.cors_origins)}")
        for idx, origin in enumerate(settings.cors_origins, 1):
            logger.info(f"  [{idx}] {origin}")
        logger.info("=" * 80)
        
        _ensure_student_schema()
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            admin_user = db.query(User).filter(User.email == settings.bootstrap_admin_email).first()
            if not admin_user:
                db.add(
                    User(
                        email=settings.bootstrap_admin_email,
                        full_name="Platform Admin",
                        hashed_password=hash_password(settings.bootstrap_admin_password),
                        role=Role.admin,
                    )
                )
            if db.query(Chapter).count() == 0:
                chapters = []
                for grade in range(4, 10):
                    for subject in ["maths", "science"]:
                        if grade < 6 and subject == "science":
                            continue
                        for number in range(1, 13):
                            chapters.append(
                                Chapter(
                                    grade=grade,
                                    subject=subject,
                                    chapter_number=number,
                                    title=f"Class {grade} {subject.title()} Chapter {number}",
                                    description=f"NCERT-aligned preparation module for class {grade} {subject}.",
                                )
                            )
                db.add_all(chapters)
            # Seed knowledge base metadata registry
            from app.services.knowledge.metadata_service import metadata_service
            metadata_service.seed_defaults(db)
            db.commit()
        finally:
            db.close()

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "service": settings.app_name}

    @app.get("/cors-debug")
    def cors_debug() -> dict:
        """DEBUG ENDPOINT: Expose current CORS configuration.
        
        This endpoint helps diagnose CORS preflight issues in production.
        Remove or restrict this endpoint after debugging.
        """
        return {
            "cors_origins_raw": settings.cors_origins_raw,
            "cors_origins_parsed": settings.cors_origins,
            "cors_allow_credentials": True,
            "cors_allow_methods": ["*"],
            "cors_allow_headers": ["*"],
            "environment": settings.environment,
            "app_name": settings.app_name,
        }

    return app


app = create_app()
