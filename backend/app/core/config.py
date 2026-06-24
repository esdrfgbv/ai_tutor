from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # =========================================
    # APP
    # =========================================

    app_name: str = "JNV Sainik AI Prep"
    environment: str = "development"

    dev_auth_debug: bool = True

    @property
    def is_dev(self) -> bool:
        return self.environment == "development"

    @property
    def auth_debug_enabled(self) -> bool:
        return self.is_dev and self.dev_auth_debug

    # =========================================
    # SECURITY
    # =========================================

    secret_key: str = Field(min_length=24)

    access_token_expire_minutes: int = 45
    refresh_token_expire_days: int = 14

    # =========================================
    # DATABASE — Supabase PostgreSQL
    # =========================================
    #
    # Set DATABASE_URL directly to the full connection string, OR provide
    # the individual SUPABASE_DB_* fields and it will be auto-built.
    # =========================================

    supabase_db_host: str | None = None
    supabase_db_port: str = "5432"
    supabase_db_name: str | None = None
    supabase_db_user: str | None = None
    supabase_db_password: str | None = None

    raw_database_url: str | None = Field(None, alias="DATABASE_URL")

    # =========================================
    # CORS
    # =========================================

    cors_origins_raw: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175,https://ai-tutor-neon-kappa.vercel.app"

    # =========================================
    # AI PROVIDER
    # =========================================

    ai_provider: str = "groq"

    groq_api_key: str | None = None

    groq_model: str = "llama-3.1-8b-instant"

    groq_vision_model: str = "meta-llama/llama-4-scout-17b-16e-instruct"

    # =========================================
    # FILES
    # =========================================

    upload_dir: Path = Path("../uploads")

    chroma_path: Path = Path("./vector_db/chroma")

    source_root: Path = Path("..")

    # =========================================
    # QUESTION EXTRACTION (LEGACY)
    # =========================================

    question_images_dir: Path = Path("../uploads/question_images")
    extraction_batch_size: int = 50

    # =========================================
    # KNOWLEDGE BASE
    # =========================================

    knowledge_upload_dir: Path = Path("../uploads/knowledge")
    dedup_similarity_threshold: float = 0.95
    max_processing_retries: int = 3
    chunk_size_tokens: int = 500
    chunk_overlap_tokens: int = 50

    # =========================================
    # ADMIN
    # =========================================

    bootstrap_admin_email: str = "admin@jnvprep.local"

    bootstrap_admin_password: str = "Admin@12345"

    # =========================================
    # COMPUTED PROPERTIES
    # =========================================

    @property
    def database_url(self) -> str:
        """Active database connection URL.

        Priority:
        1. Explicit ``DATABASE_URL`` env var (if set by user)
        2. Auto-built from SUPABASE_DB_* fields
        """
        if self.raw_database_url:
            return self.raw_database_url
        return (
            f"postgresql+psycopg2://{self.supabase_db_user}:{self.supabase_db_password}"
            f"@{self.supabase_db_host}:{self.supabase_db_port}/{self.supabase_db_name}"
        )

    # =========================================
    # PYDANTIC CONFIG
    # =========================================

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        if not self.cors_origins_raw:
            return []
        return [o.strip() for o in self.cors_origins_raw.split(",") if o.strip()]


# =========================================
# EXAM → DIRECTORY NAME MAPPING
# =========================================

EXAM_DIR_MAP: dict[str, str] = {
    "JNV": "JNV",
    "Sainik": "Sainik School",
}


def exam_dir_name(target_exam: str) -> str:
    """Map stored target_exam value to the actual filesystem directory name."""
    return EXAM_DIR_MAP.get(target_exam, target_exam)


# =========================================
# PROJECT ROOT DETECTION
# =========================================

def _detect_project_root() -> Path:
    here = Path(__file__).resolve()

    for parent in here.parents:
        if (parent / "JNV").exists() and (parent / "JNV" / "class_9").exists():
            return parent

    return here.parents[3]


# =========================================
# SETTINGS CACHE
# =========================================

@lru_cache
def get_settings() -> Settings:
    settings = Settings()

    root = Path(settings.source_root)

    if not root.is_absolute():
        root = (
            Path.cwd() / root
        ).resolve()

    if not (root / "JNV" / "class_9").exists():
        root = _detect_project_root()

    settings.source_root = root

    if not Path(settings.chroma_path).is_absolute():
        settings.chroma_path = (root / settings.chroma_path).resolve()

    if not Path(settings.upload_dir).is_absolute():
        settings.upload_dir = (
            root / settings.upload_dir
        ).resolve()

    if not Path(settings.knowledge_upload_dir).is_absolute():
        settings.knowledge_upload_dir = (
            root / settings.knowledge_upload_dir
        ).resolve()

    return settings