from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.api.routes import admin, analytics, auth, leaderboard, learning, parents, quizzes
from app.core.config import get_settings
from app.core.logging import LoggingMiddleware, get_logger
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models.enums import Role
from app.models.models import Chapter, User

logger = get_logger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="1.0.0")
    
    # Add logging middleware FIRST so it catches everything
    app.add_middleware(LoggingMiddleware)
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
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

    @app.on_event("startup")
    def bootstrap() -> None:
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
            db.commit()
        finally:
            db.close()

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "service": settings.app_name}

    return app


app = create_app()
