from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # =========================================
    # APP
    # =========================================

    app_name: str = "JNV Sainik AI Prep"
    environment: str = "development"

    # Set to True to enable verbose auth debug logging (development only).
    # Automatically disabled when environment != "development".
    dev_auth_debug: bool = True

    # =========================================
    # SECURITY
    # =========================================

    secret_key: str = Field(min_length=24)

    access_token_expire_minutes: int = 45
    refresh_token_expire_days: int = 14

    # =========================================
    # DATABASE
    # =========================================

    database_url: str

    # =========================================
    # CORS
    # =========================================

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ]

    # =========================================
    # AI PROVIDER
    # =========================================

    ai_provider: str = "groq"

    # =========================================
    # GROQ
    # =========================================

    groq_api_key: str | None = None

    groq_model: str = (
        "llama-3.1-8b-instant"
    )

    # =========================================
    # GEMINI (OPTIONAL)
    # =========================================

    gemini_api_key: str | None = None

    gemini_model: str = (
        "gemini-1.5-flash"
    )

    # =========================================
    # FILES
    # =========================================

    upload_dir: Path = Path("../uploads")

    source_root: Path = Path("..")

    # =========================================
    # ADMIN
    # =========================================

    bootstrap_admin_email: str = (
        "admin@jnvprep.local"
    )

    bootstrap_admin_password: str = (
        "Admin@12345"
    )

    # =========================================
    # PYDANTIC CONFIG
    # =========================================

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # =========================================
    # VALIDATORS
    # =========================================

    @field_validator(
        "cors_origins",
        mode="before",
    )
    @classmethod
    def parse_origins(
        cls,
        value: str | list[str],
    ) -> list[str]:

        if isinstance(value, str):
            return [
                origin.strip()
                for origin in value.split(",")
                if origin.strip()
            ]

        return value


# =========================================
# PROJECT ROOT DETECTION
# =========================================

def _detect_project_root() -> Path:
    here = Path(__file__).resolve()

    for parent in here.parents:
        if (parent / "class_9").exists():
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

    if not (root / "class_9").exists():
        root = _detect_project_root()

    settings.source_root = root

    if not Path(settings.upload_dir).is_absolute():
        settings.upload_dir = (
            root / settings.upload_dir
        ).resolve()

    return settings