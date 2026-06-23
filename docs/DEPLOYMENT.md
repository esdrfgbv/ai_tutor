# Deployment Guide

## Render (Backend)

### Settings

| Setting | Value |
|---------|-------|
| **Runtime** | Python 3.12 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Health Check Path** | `/health` |
| **Region** | `Singapore` (closest to target users in India) |

### Required Environment Variables

| Variable | Render Secret Name |
|----------|--------------------|
| `DATABASE_URL` | Must point to a managed MySQL (e.g., Render PostgreSQL — switch driver or use Aiven/PlanetScale for MySQL) |
| `SECRET_KEY` | Generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `GROQ_API_KEY` | Your Groq API key |
| `CORS_ORIGINS_RAW` | `https://your-frontend-domain.vercel.app` |
| `ENVIRONMENT` | `production` |
| `SOURCE_ROOT` | `/opt/render/project/src` (Render project root) |
| `CHROMA_PATH` | Persistent disk path or disable if not needed |

### Important Notes

- **ChromaDB** writes to disk — use Render's **Persistent Disk** or a managed vector DB
- **MySQL** is not provided by Render. Use **Aiven MySQL**, **PlanetScale**, or **Supabase** for the database
- The `JNV/` and `Sainik School/` content directories must be included in the deployment
- Set `AI_PROVIDER=groq` for the fastest setup (only needs a single API key)

---

## Vercel (Frontend)

### Settings

| Setting | Value |
|---------|-------|
| **Framework** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Node Version** | 22.x |

### Required Environment Variables

| Variable | Vercel Secret Name |
|----------|---------------------|
| `VITE_API_URL` | `https://your-backend.onrender.com/api` |

### Route Handling

All frontend routes are client-side (React Router). Vercel automatically handles SPA fallback when using Vite framework preset — no additional rewrites needed.

### Important Notes

- `VITE_GROQ_API_KEY` is optional and exposed to the browser. Prefer proxying AI requests through the backend instead

---

## Supabase (Database)

> **Note:** The application uses **SQLAlchemy ORM** and is compatible with PostgreSQL through the `psycopg2` driver. To use Supabase, change the `DATABASE_URL` format:
>
> `postgresql+psycopg2://postgres:[PASSWORD]@[HOST]:6543/postgres`

### Required Configuration

| Setting | Value |
|---------|-------|
| **Connection Pooler (Session)** | `DATABASE_URL` → `postgresql+psycopg2://...@aws-0-ap-south-1.pooler.supabase.com:6543/postgres` |
| **Connection String (Direct)** | `DATABASE_URL` → `postgresql+psycopg2://...@db.[PROJECT].supabase.co:5432/postgres` |
| **SSL Mode** | `?sslmode=require` appended to connection string |

### Schema Migration

Run once after connecting:
```bash
cd backend
alembic upgrade head
```

### Row Level Security (RLS)

Application uses **application-level auth** (JWT tokens, session-based), not Supabase RLS. Policy evaluation happens in Python, not at the DB level. If using Supabase, disable RLS for all tables and rely on the backend's middleware checks.

### Storage (PDF files)

The app reads PDFs directly from the filesystem (`JNV/` and `Sainik School/` directories). When deploying on Render, these must be included in the build artifact or mounted via persistent disk.

---

## Local Development

```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
cp .env.example .env      # Configure your .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### Docker

```bash
docker compose up --build
```
