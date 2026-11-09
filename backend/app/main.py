"""CampusMate FastAPI application.

Run locally:  uvicorn app.main:app --reload --port 8000
Docs:         http://localhost:8000/docs
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import SessionLocal, init_db
from .routers import auth, chat, documents, tickets
from .services.answer_policy import CATEGORIES
from .services.seed import seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Seed synthetic demo data on first start (idempotent).
    if os.getenv("CAMPUSMATE_SEED", "1") == "1":
        db = SessionLocal()
        try:
            seed_demo_data(db)
        finally:
            db.close()
    yield


app = FastAPI(
    title="CampusMate API",
    description=(
        "Smart Student Helpdesk Chatbot — retrieval-augmented answers grounded "
        "in college-approved notices, with citations, clarification and a "
        "helpdesk ticket fallback. Ships with synthetic SAMPLE data only."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(tickets.router)


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {
        "status": "ok",
        "environment": settings.environment,
        "llm_provider": settings.llm_provider,
        "embedding_provider": settings.embedding_provider,
    }


@app.get("/meta/categories", tags=["meta"])
def categories() -> dict:
    return {"categories": CATEGORIES}
