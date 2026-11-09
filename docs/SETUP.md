# Setup

Two ways to run CampusMate: a zero-setup local run (SQLite + offline stub
models) or the full stack with Docker (PostgreSQL + pgvector).

## Prerequisites

- **Local run:** Python 3.11+, Node.js 18+
- **Docker run:** Docker Engine with the Compose plugin

---

## Option A — Local run (recommended for a quick demo)

No database server or API key required. The backend defaults to SQLite and
deterministic offline model adapters.

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

```bash
# Frontend (second terminal)
cd frontend
npm install
npm run dev
```

- Frontend: <http://localhost:5173>
- API docs: <http://localhost:8000/docs>

The first backend start seeds synthetic sample notices. The Vite dev server
proxies `/api` to the backend.

### Demo admin credentials (sample only)

```
email:    admin@campusmate.demo
password: campusmate-demo
```

Override with `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`.

---

## Option B — Docker (PostgreSQL + pgvector)

```bash
cp .env.example .env        # edit values; never commit .env
docker compose up --build
```

- Frontend: <http://localhost:8080>
- API docs: <http://localhost:8000/docs>

Services:

| Service | Image | Purpose |
| --- | --- | --- |
| `db` | `pgvector/pgvector:pg16` | PostgreSQL with the pgvector extension |
| `backend` | built from `Dockerfile.backend` | FastAPI app |
| `frontend` | built from `Dockerfile.frontend` | Static build served by nginx, proxying `/api` |

Stop with `docker compose down`. Add `-v` to also delete volumes (data).

---

## Configuration

All settings are environment variables (see `.env.example`). Key ones:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite (default) or `postgresql+psycopg2://...` |
| `SECRET_KEY` | JWT signing key — **change in production** |
| `LLM_PROVIDER` | `stub` (offline) or `openai` |
| `LLM_API_KEY` | Hosted model key (server-side only) |
| `EMBEDDING_PROVIDER` | `hashing` (offline) or `openai` |
| `EMBEDDING_API_KEY` | Hosted embedding key |
| `RETRIEVAL_MIN_SCORE` / `RETRIEVAL_MIN_COVERAGE` | Evidence thresholds |
| `CAMPUSMATE_SEED` | `1` seeds demo data on start, `0` starts empty |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | Where notices are stored and size limit |
| `CORS_ORIGINS` | Comma-separated allowed origins |

Never commit a real `.env`. `.gitignore` excludes it.

---

## Database migrations (Alembic)

The schema is created automatically on startup. For explicit migrations:

```bash
cd backend
# against your configured DATABASE_URL
alembic upgrade head

# create a new migration after model changes
alembic revision --autogenerate -m "describe change"
```

The PostgreSQL reference schema is also in `database/schema.sql`.

---

## Switching to hosted models

```bash
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
EMBEDDING_PROVIDER=openai
EMBEDDING_API_KEY=sk-...
```

Restart the backend. Because embeddings change, re-index existing documents
(`POST /admin/notices/{id}/reindex`) so stored vectors match the new model.

---

## Running the tests

```bash
# from the repository root
python -m pytest
python tests/run_validation.py
```

See [TESTING.md](TESTING.md) for what each covers.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Frontend shows "Offline" badge | Backend not reachable; start it or check `VITE_API_TARGET` |
| `401 Not authenticated` | Log in again; token expired |
| `403 requires publisher permissions` | Account role is `viewer`; use an `admin`/`publisher` account |
| Port already in use | Change `--port` / compose port mapping |
| Empty chatbot after switching embedding provider | Re-index documents |
