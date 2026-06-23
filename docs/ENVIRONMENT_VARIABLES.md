# Environment Variables Reference

## Backend (`backend/.env`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `APP_NAME` | Application name for the FastAPI title | Yes | `JNV Sainik AI Prep` |
| `ENVIRONMENT` | Runtime environment: `development` or `production` | Yes | `development` |
| `SECRET_KEY` | 64-char hex string for JWT signing. Generate with: `python -c "import secrets; print(secrets.token_hex(32))"` | Yes | — |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT access token lifetime in minutes | No | `45` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | JWT refresh token lifetime in days | No | `14` |
| `DATABASE_URL` | Full SQLAlchemy PostgreSQL connection string. Overrides SUPABASE_DB_* fields | No | — |
| `SUPABASE_DB_HOST` | Supabase PostgreSQL host | Conditional | — |
| `SUPABASE_DB_PORT` | Supabase PostgreSQL port | No | `5432` |
| `SUPABASE_DB_NAME` | Supabase database name | Conditional | — |
| `SUPABASE_DB_USER` | Supabase database user | Conditional | — |
| `SUPABASE_DB_PASSWORD` | Supabase database password | Conditional | — |
| `CORS_ORIGINS_RAW` | Comma-separated list of allowed CORS origins | No | `http://localhost:5173` |
| `AI_PROVIDER` | Active AI provider: `groq`, `gemini`, or `openai` | Yes | `groq` |
| `GROQ_API_KEY` | Groq API key (required when `AI_PROVIDER=groq`) | Conditional | — |
| `GROQ_MODEL` | Groq model name | No | `llama-3.1-8b-instant` |
| `GEMINI_API_KEY` | Google Gemini API key (required when `AI_PROVIDER=gemini`) | Conditional | — |
| `GEMINI_MODEL` | Gemini model name | No | `gemini-1.5-flash-latest` |
| `OPENAI_API_KEY` | OpenAI API key (required when `AI_PROVIDER=openai`) | Conditional | — |
| `OPENAI_MODEL` | OpenAI model name | No | `gpt-4.1-mini` |
| `EMBEDDING_MODEL` | Sentence-transformers model for vector embeddings | No | `sentence-transformers/all-MiniLM-L6-v2` |
| `CHROMA_PATH` | Path to ChromaDB vector store directory | No | `../vector_db/chroma` |
| `UPLOAD_DIR` | Path to uploaded files directory | No | `../uploads` |
| `SOURCE_ROOT` | Project root path for content discovery (JNV/Sainik School PDFs) | No | `..` |
| `BOOTSTRAP_ADMIN_EMAIL` | Email for auto-created admin account on first startup | No | `admin@jnvprep.local` |
| `BOOTSTRAP_ADMIN_PASSWORD` | Password for auto-created admin account | No | `change-me` |

## Frontend (`frontend/.env`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_API_URL` | Backend API base URL | Yes | `http://localhost:8000/api` |
| `VITE_GROQ_API_KEY` | Groq API key for client-side AI features (exposed to browser) | No | — |
