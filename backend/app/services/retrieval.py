"""Hybrid retrieval: keyword (lexical) + vector (semantic) search.

Metadata filters (programme, semester, validity window, active knowledge
version) are applied *before* scoring so that stale or inapplicable notices can
never be returned as evidence.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Document, KnowledgeVersion, Passage
from .embeddings import cosine, get_embedder

_TOKEN_RE = re.compile(r"[a-z0-9]+")

# Common words carry no retrieval signal and would otherwise dominate the
# lexical score. Removing them keeps keyword scoring explainable.
_STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "am", "do", "does",
    "did", "my", "me", "i", "you", "your", "we", "our", "it", "its", "of",
    "to", "in", "on", "at", "for", "and", "or", "if", "then", "this", "that",
    "these", "those", "when", "where", "what", "which", "who", "how", "can",
    "could", "will", "would", "should", "shall", "may", "might", "get", "got",
    "need", "needs", "please", "tell", "about", "with", "from", "by", "as",
    "there", "here", "next", "up", "out", "so", "no", "not", "yes",
}


@dataclass
class RetrievedPassage:
    document: Document
    page_number: int
    content: str
    keyword_score: float
    vector_score: float
    score: float


def _content_terms(text: str) -> set[str]:
    return {t for t in _TOKEN_RE.findall(text.lower()) if t not in _STOPWORDS}


def _term_matches(query_term: str, haystack_terms: set[str]) -> bool:
    """Match a query term against haystack terms with light stemming.

    Exact matches count, and so does a shared stem of at least four characters
    ("exam" ~ "examination", "timetable" ~ "timetables", "register" ~
    "registration"). Short terms must match exactly to avoid noise.
    """
    if query_term in haystack_terms:
        return True
    if len(query_term) >= 4:
        for term in haystack_terms:
            if len(term) >= 4 and (
                term.startswith(query_term) or query_term.startswith(term)
            ):
                return True
    return False


def _keyword_score(query_terms: set[str], haystack: str) -> tuple[float, float]:
    """Return ``(coverage, density)``.

    * coverage - fraction of the query's content words present in the haystack.
    * density  - fraction of the haystack's content words that match the query.

    The haystack is the passage text plus its document metadata, so a query that
    names a programme or semester still counts those words as matched.
    """
    terms = _content_terms(haystack)
    if not terms or not query_terms:
        return 0.0, 0.0
    matched = {q for q in query_terms if _term_matches(q, terms)}
    return len(matched) / len(query_terms), len(matched) / len(terms)


def _metadata_haystack(document: Document) -> str:
    return " ".join(
        filter(
            None,
            [
                document.title,
                document.category,
                document.programme,
                document.academic_year,
                document.semester,
                document.subject,
            ],
        )
    )


def _is_expired(expiry: str | None, today: date) -> bool:
    if not expiry:
        return False
    try:
        # Accept ISO dates (YYYY-MM-DD); ignore free-form strings we cannot parse.
        y, m, d = (int(p) for p in expiry.split("-")[:3])
        return date(y, m, d) < today
    except (ValueError, TypeError):
        return False


def retrieve(
    db: Session,
    query: str,
    *,
    category: str | None = None,
    programme: str | None = None,
    semester: str | None = None,
    subject: str | None = None,
    academic_year: str | None = None,
    top_k: int | None = None,
    include_inactive: bool = False,
) -> list[RetrievedPassage]:
    top_k = top_k or settings.retrieval_top_k
    embedder = get_embedder()

    active_version = db.scalar(
        select(KnowledgeVersion).where(KnowledgeVersion.is_active.is_(True))
    )

    stmt = select(Document).where(Document.status == "published")
    if not include_inactive and active_version is not None:
        stmt = stmt.where(Document.knowledge_version_id == active_version.id)
    if category:
        stmt = stmt.where(Document.category == category)
    if programme:
        # Match the requested programme or documents that apply to everyone.
        stmt = stmt.where(
            (Document.programme == programme) | (Document.programme.is_(None))
        )
    if semester:
        stmt = stmt.where(
            (Document.semester == semester) | (Document.semester.is_(None))
        )
    if subject:
        stmt = stmt.where(
            (Document.subject == subject) | (Document.subject.is_(None))
        )
    if academic_year:
        stmt = stmt.where(
            (Document.academic_year == academic_year)
            | (Document.academic_year.is_(None))
        )

    documents = list(db.scalars(stmt))
    if not documents:
        return []

    doc_ids = [d.id for d in documents]
    passages = list(db.scalars(select(Passage).where(Passage.document_id.in_(doc_ids))))

    query_terms = _content_terms(query)
    query_vec = embedder.embed_one(query)
    today = date.today()

    results: list[RetrievedPassage] = []
    for passage in passages:
        document = next(d for d in documents if d.id == passage.document_id)
        if _is_expired(document.expiry_date, today):
            continue
        haystack = f"{passage.content} {_metadata_haystack(document)}"
        coverage, density = _keyword_score(query_terms, haystack)
        v_score = cosine(query_vec, passage.embedding)
        # Require the passage to actually cover the asked-for words. Without this
        # gate a passage that merely shares one incidental word ("Friday") could
        # be offered as evidence for an unrelated question.
        if coverage < settings.retrieval_min_coverage:
            continue
        # Weighted hybrid score. Coverage (did we find the asked-for terms?)
        # dominates; density and vector similarity break ties.
        score = 0.55 * coverage + 0.25 * density + 0.20 * max(v_score, 0.0)
        if score <= settings.retrieval_min_score:
            continue
        results.append(
            RetrievedPassage(
                document=document,
                page_number=passage.page_number,
                content=passage.content,
                keyword_score=coverage,
                vector_score=v_score,
                score=score,
            )
        )

    results.sort(key=lambda r: r.score, reverse=True)
    return results[:top_k]


def source_status(document: Document, today: date | None = None) -> str:
    """Classify a document for the source card."""
    today = today or date.today()
    if document.status == "retired":
        return "expired"
    if document.status == "replaced":
        return "replaced"
    if _is_expired(document.expiry_date, today):
        return "expired"
    return "current"
