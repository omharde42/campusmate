"""Document endpoints.

Public (student-facing, read-only):
* list published notices
* read a document's metadata + extracted passages
* download/open the source file (authorisation-checked)

Admin (authenticated):
* upload a PDF or FAQ, with metadata
* review extracted text
* publish / replace
* version history
* retire
* trigger re-indexing
"""

from __future__ import annotations

import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Admin, Document, KnowledgeVersion
from ..schemas import (
    DocumentDetail,
    DocumentOut,
    PassageOut,
    ReindexResult,
)
from ..security import get_current_admin, require_publisher
from ..services import documents as doc_service
from ..services import publishing
from ..services.retrieval import source_status

router = APIRouter(tags=["documents"])


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------
@router.get("/documents", response_model=list[DocumentOut])
def list_documents(
    category: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
) -> list[Document]:
    """List notices. Students only ever see published notices."""
    stmt = select(Document).where(Document.status == "published")
    if category:
        stmt = stmt.where(Document.category == category)
    if status:
        stmt = stmt.where(Document.status == status)
    return list(db.scalars(stmt.order_by(Document.published_at.desc())))


@router.get("/documents/{doc_uid}", response_model=DocumentDetail)
def get_document(doc_uid: str, db: Session = Depends(get_db)) -> DocumentDetail:
    document = db.scalar(select(Document).where(Document.doc_uid == doc_uid))
    if document is None or document.status not in {"published", "replaced", "retired"}:
        raise HTTPException(status_code=404, detail="Document not found")
    detail = DocumentDetail.model_validate(document)
    detail.passages = [PassageOut.model_validate(p) for p in document.passages]
    detail.source_status = source_status(document)
    return detail


@router.get("/documents/{doc_uid}/source")
def open_source(doc_uid: str, db: Session = Depends(get_db)):
    """Serve the source file after an authorisation check.

    Only documents that are published (current), replaced, or retired are
    servable. Draft documents are never exposed.
    """
    document = db.scalar(select(Document).where(Document.doc_uid == doc_uid))
    if document is None or document.status == "draft":
        raise HTTPException(status_code=404, detail="Source not available")
    if not document.stored_path or not os.path.exists(document.stored_path):
        raise HTTPException(status_code=404, detail="Source file missing")
    return FileResponse(
        document.stored_path,
        media_type="application/pdf",
        filename=os.path.basename(document.stored_path),
    )


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------
@router.get("/admin/notices", response_model=list[DocumentOut])
def admin_list_notices(
    db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)
) -> list[Document]:
    return list(db.scalars(select(Document).order_by(Document.created_at.desc())))


@router.post("/admin/notices", response_model=DocumentOut, status_code=201)
async def upload_notice(
    title: str = Form(...),
    category: str = Form(...),
    doc_type: str = Form("pdf"),
    programme: str | None = Form(None),
    academic_year: str | None = Form(None),
    semester: str | None = Form(None),
    subject: str | None = Form(None),
    publication_date: str | None = Form(None),
    effective_date: str | None = Form(None),
    expiry_date: str | None = Form(None),
    source_page: int | None = Form(None),
    replaces_document_id: int | None = Form(None),
    body: str | None = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    admin: Admin = Depends(require_publisher),
) -> Document:
    """Upload a notice (PDF) or create an FAQ. Saved as ``draft`` until published."""
    replace_target = None
    if replaces_document_id:
        replace_target = db.get(Document, replaces_document_id)
        if replace_target is None:
            raise HTTPException(status_code=404, detail="Replaced document not found")

    version = (replace_target.version + 1) if replace_target else 1

    stored_path = None
    pages: list[tuple[int, str]] = []

    if doc_type == "pdf":
        if file is None:
            raise HTTPException(status_code=400, detail="A PDF file is required")
        data = await file.read()
        if len(data) > settings.max_upload_mb * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large")
        os.makedirs(settings.upload_dir, exist_ok=True)
        safe_name = os.path.basename(file.filename or "notice.pdf")
        stored_path = os.path.join(settings.upload_dir, f"{publishing.new_doc_uid(category)}-{safe_name}")
        with open(stored_path, "wb") as fh:
            fh.write(data)
        pages = doc_service.extract_pdf_pages(data)
    elif doc_type == "faq":
        if not body:
            raise HTTPException(status_code=400, detail="FAQ text is required")
        pages = doc_service.extract_text_pages(body)
    else:
        raise HTTPException(status_code=400, detail="Unsupported document type")

    document = Document(
        doc_uid=publishing.new_doc_uid(category),
        title=title,
        category=category,
        doc_type=doc_type,
        programme=programme,
        academic_year=academic_year,
        semester=semester,
        subject=subject,
        publication_date=publication_date,
        effective_date=effective_date,
        expiry_date=expiry_date,
        version=version,
        source_page=source_page,
        status="draft",
        stored_path=stored_path,
        replaces_document_id=replaces_document_id,
        uploaded_by_id=admin.id,
    )
    db.add(document)
    db.flush()
    doc_service.index_document(db, document, pages)
    db.commit()
    db.refresh(document)
    return document


@router.get("/admin/notices/{doc_id}/extracted", response_model=list[PassageOut])
def review_extracted(
    doc_id: int, db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)
) -> list[PassageOut]:
    document = db.get(Document, doc_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return [PassageOut.model_validate(p) for p in document.passages]


@router.post("/admin/notices/{doc_id}/reindex", response_model=ReindexResult)
def reindex(
    doc_id: int, db: Session = Depends(get_db), _: Admin = Depends(require_publisher)
) -> ReindexResult:
    document = db.get(Document, doc_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.doc_type == "pdf" and document.stored_path:
        pages = doc_service.extract_pdf_pages(open(document.stored_path, "rb").read())
    else:
        text = "\n".join(p.content for p in document.passages)
        pages = doc_service.extract_text_pages(text)
    count = doc_service.index_document(db, document, pages)
    db.commit()
    version = (
        db.get(KnowledgeVersion, document.knowledge_version_id)
        if document.knowledge_version_id
        else None
    )
    return ReindexResult(
        document_id=document.doc_uid,
        passages_indexed=count,
        knowledge_version=version.label if version else "n/a",
        message="Re-indexing complete. New index is ready.",
    )


@router.post("/admin/notices/{doc_id}/publish", response_model=DocumentOut)
def publish(
    doc_id: int, db: Session = Depends(get_db), _: Admin = Depends(require_publisher)
) -> Document:
    document = db.get(Document, doc_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    replace_target = None
    if document.replaces_document_id:
        replace_target = db.get(Document, document.replaces_document_id)

    try:
        publishing.publish_document(db, document, replace_document=replace_target)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return document


@router.post("/admin/notices/{doc_id}/retire", response_model=DocumentOut)
def retire(
    doc_id: int, db: Session = Depends(get_db), _: Admin = Depends(require_publisher)
) -> Document:
    document = db.get(Document, doc_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    document.status = "retired"
    db.commit()
    db.refresh(document)
    return document


@router.get("/admin/notices/{doc_id}/versions", response_model=list[DocumentOut])
def version_history(
    doc_id: int, db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)
) -> list[Document]:
    """All versions of a notice, linked by the replace chain."""
    document = db.get(Document, doc_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    # Walk back to the earliest version, then forward through replacements.
    root = document
    while root.replaces_document_id:
        parent = db.get(Document, root.replaces_document_id)
        if parent is None:
            break
        root = parent

    chain: list[Document] = [root]
    cursor = root
    while True:
        child = db.scalar(
            select(Document).where(Document.replaces_document_id == cursor.id)
        )
        if child is None:
            break
        chain.append(child)
        cursor = child
    return chain


@router.get("/admin/overview")
def admin_overview(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    from ..schemas import OverviewStats
    from ..models import ChatLog, KnowledgeVersion, Ticket

    documents = list(db.scalars(select(Document)))
    tickets = list(db.scalars(select(Ticket)))
    logs = list(db.scalars(select(ChatLog).where(ChatLog.answer_state != "answered")))

    unanswered: dict[str, int] = {}
    for log in logs:
        key = log.category or "Uncategorised"
        unanswered[key] = unanswered.get(key, 0) + 1

    active = db.scalar(
        select(KnowledgeVersion).where(KnowledgeVersion.is_active.is_(True))
    )
    return OverviewStats(
        total_notices=len(documents),
        published_notices=sum(1 for d in documents if d.status == "published"),
        replaced_notices=sum(1 for d in documents if d.status == "replaced"),
        pending_tickets=sum(
            1 for t in tickets if t.status in {"open", "pending", "in_progress"}
        ),
        resolved_tickets=sum(
            1 for t in tickets if t.status in {"resolved", "closed"}
        ),
        unanswered_categories=unanswered,
        active_knowledge_version=active.label if active else None,
        is_sample_data=True,
    )
