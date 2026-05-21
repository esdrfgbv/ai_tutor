# PrepOrbit AI: JNV + Sainik School Preparation Platform

Complete full-stack edtech platform with React, FastAPI, MySQL, JWT auth, role-based portals, AI RAG, PDF ingestion, Chroma vector search, adaptive quiz generation, dashboards, and analytics.

## Architecture

- `frontend/`: React, React Router, Tailwind CSS, Axios, Framer Motion, Recharts.
- `backend/`: FastAPI, SQLAlchemy, JWT auth, RBAC, service-layer architecture.
- `ingestion/`: automated PDF scanner, PyMuPDF extraction, cleaning, chunking, embeddings, Chroma indexing, MySQL metadata.
- `database/`: normalized MySQL schema.
- `vector_db/`: Chroma persistent store.
- `uploads/`: admin uploaded PDFs.

## Run Locally

1. Copy backend environment:

```powershell
Copy-Item backend\.env.example backend\.env
```

2. Edit `backend/.env` and add either `OPENAI_API_KEY` with `AI_PROVIDER=openai` or `GEMINI_API_KEY` with `AI_PROVIDER=gemini`.

3. Start infrastructure and apps:

```powershell
docker compose up --build
```

4. Open:

- Frontend: `http://localhost:5173`
- Backend docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

Default admin is configured by `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` in `backend/.env`.

## Index Existing PDFs

With services running and `backend/.env` configured:

```powershell
.\scripts\ingest.ps1
```

The ingestion job scans the current workspace, including folders such as `class 4 maths`, `class 6 science`, `novodaya pyqs`, and `aiseee pyqs`. It stores document metadata in MySQL and semantic vectors in Chroma.

## API Surface

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`
- `GET /api/learning/chapters`, `POST /api/learning/doubts`, `POST /api/learning/progress/{chapter_id}`
- `GET /api/quizzes`, `POST /api/quizzes/generate`, `POST /api/quizzes/attempts`
- `GET /api/analytics/student`, `GET /api/analytics/student/{student_id}`, `GET /api/analytics/admin`
- `POST /api/parents/links`, `GET /api/parents/children`
- `GET /api/admin/users`, `POST /api/admin/upload-pdf`, `POST /api/admin/announcements`
- `GET /api/leaderboard`

## Deployment Notes

- Use managed MySQL in production and set `DATABASE_URL` accordingly.
- Persist `vector_db/chroma` on a durable volume.
- Put FastAPI behind a TLS-enabled reverse proxy.
- Set a strong `SECRET_KEY` and rotate refresh tokens by forcing login when needed.
- Run ingestion as a scheduled worker after PDF uploads or content updates.
- Build the frontend with `npm run build` and serve `dist/` from CDN or Nginx.
