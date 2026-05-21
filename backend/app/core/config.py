from functools import lru_cache
from pathlib import Path

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "JNV Sainik AI Prep"
    environment: str = "development"
    secret_key: str = Field(min_length=24)
    access_token_expire_minutes: int = 45
    refresh_token_expire_days: int = 14
    database_url: str
    # Allow common local dev origins (Vite may pick different ports)
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"]
    ai_provider: str = "openai"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"
    openrouter_api_key: str | None = None
    openrouter_model: str = "meta-llama/llama-3.1-8b-instruct:free"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    chroma_path: Path = Path("../vector_db/chroma")
    upload_dir: Path = Path("../uploads")
    source_root: Path = Path("..")
    bootstrap_admin_email: str = "admin@jnvprep.local"
    bootstrap_admin_password: str = "Admin@12345"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


def _detect_project_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "class_9").exists():
            return parent
    return here.parents[3]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    root = Path(settings.source_root)
    if not root.is_absolute():
        root = (Path.cwd() / root).resolve()
    if not (root / "class_9").exists():
        root = _detect_project_root()
    settings.source_root = root
    if not Path(settings.chroma_path).is_absolute():
        settings.chroma_path = (root / settings.chroma_path).resolve()
    if not Path(settings.upload_dir).is_absolute():
        settings.upload_dir = (root / settings.upload_dir).resolve()
    return settings
