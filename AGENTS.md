# AGENTS.md — CampusMate repository notes

Smart Student Helpdesk Chatbot. React + Vite frontend, FastAPI backend,
PostgreSQL + pgvector (SQLite fallback for zero-setup local dev). Ships with
**synthetic sample data only**.

## Layout

- `frontend/` — React app (`src/pages`, `src/components`, `src/lib/api.js`).
  API client falls back to `src/lib/offlineEngine.js` when the backend is
  unreachable (surfaced as `mode: "live" | "offline"`).
- `backend/app/` — FastAPI app. `routers/` (HTTP), `services/` (logic),
  `models.py`, `schemas.py`, `security.py`, `config.py`.
- `backend/alembic/` — migrations. `database/schema.sql` — PostgreSQL reference.
- `tests/` — pytest suite + `dataset/questions.json` (50 questions) and
  `run_validation.py`.
- `docs/` — architecture, API, setup, testing, demo script, demo data,
  requirements traceability.

## Common commands

```bash
# backend (from backend/)
uvicorn app.main:app --reload --port 8000      # http://localhost:8000/docs
# frontend (from frontend/)
npm run dev                                     # http://localhost:5173
# tests (from repo root)
python -m pytest                                # 124 tests
python tests/run_validation.py                  # 50-question validation
# docker (from repo root)
cp .env.example .env && docker compose up --build   # :8080 frontend, :8000 api
# vercel services (from repo root)
vercel dev                                          # runs backend + frontend locally
```

Demo admin: `admin@campusmate.demo` / `campusmate-demo`.

## Key conventions

- **Config is env-driven** (`app/config.py`, `.env.example`). Never hardcode
  secrets or put API keys in the frontend.
- **Model adapters**: `services/llm.py` and `services/embeddings.py` each have a
  deterministic offline implementation (`stub` / `hashing`) and a hosted one
  (`openai`). Tests and the demo use the offline ones.
- **Answer policy** (`services/answer_policy.py`, `services/chat.py`): three
  states — `answered`, `needs_context`, `escalated`. Answers must be grounded in
  retrieved evidence; never invent facts. Unsupported → escalate.
- **Embedding column is portable**: pgvector `Vector` on PostgreSQL, JSON text
  on SQLite (`models.py`). `cosine()` must accept both lists and numpy arrays —
  never call `bool()` on an embedding.
- **Synthetic data discipline**: every seeded notice is tagged `[SAMPLE DEMO
  DATA]` and titled `(sample)`; the UI shows a SAMPLE DATA tag and
  `is_sample_data: true`. Do not present sample data as real college info.
- **Proposed vs measured**: presentation targets live in the UI as *proposed*;
  measured demo numbers are separate (`docs/TESTING.md`). Never present targets
  as achieved results.

## Verified state

- `python -m pytest` → 124 passed.
- Validation harness → 25/25 supported answers, 100% citation coverage, 0
  unsupported guesses (demo build, stub models).
- Full `docker compose` stack (PostgreSQL + pgvector) verified end-to-end:
  health, chat with citation, frontend nginx `/api` proxy.
- Browser flows verified: clarification (progressive), answered-with-citation,
  escalation with ticket option.

## Gotchas

- `docker compose` backend may fail on first start if the `db` DNS name is not
  resolvable yet; `restart: unless-stopped` is set. In restricted sandboxes
  Docker's embedded DNS can fail entirely — verify the pgvector path by pointing
  `DATABASE_URL` at the published `127.0.0.1:5432` port instead.
- Auth routes are under the `/auth` prefix (`/auth/login`, `/auth/token`,
  `/auth/me`).
- Frontend `VITE_API_TARGET` (dev) / nginx `proxy_pass` (prod) must point at the
  backend for `/api` calls to work.
- Vercel services (`vercel.json`): `/api/(.*)` → `backend`, `/(.*)` →
  `frontend`. Vercel forwards the original path, so the app auto-sets
  `root_path=/api` when `VERCEL`/`VERCEL_ENV` is present; nginx (Docker) strips
  `/api` itself, so `root_path` stays empty there. `app.main:create_app(root_path=...)`
  builds the app for tests.
- Vercel's filesystem is read-only except `/tmp`, so the config falls back to
  `/tmp` for the SQLite DB and uploads when on Vercel (or when the cwd is not
  writable). That store is ephemeral — set `DATABASE_URL` to hosted PostgreSQL
  for persistence. Missing source files are regenerated from stored passages.
