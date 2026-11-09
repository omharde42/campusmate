"""Pydantic request/response schemas (API contract)."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# ---------------------------------------------------------------------------
# Shared enums
# ---------------------------------------------------------------------------
Category = Literal[
    "Admissions", "Fees", "Examinations", "Timetables", "College activities"
]
AnswerState = Literal["answered", "needs_context", "escalated"]
DocumentStatus = Literal["draft", "published", "replaced", "retired"]
TicketStatus = Literal["open", "pending", "in_progress", "resolved", "closed"]


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: str


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------
class ChatContext(BaseModel):
    programme: str | None = None
    semester: str | None = None
    subject: str | None = None
    academic_year: str | None = None
    # Prior turns, e.g. [{"role": "student", "content": "When is my exam?"}]
    history: list[dict] = Field(default_factory=list)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    context: ChatContext = Field(default_factory=ChatContext)


class Citation(BaseModel):
    document_id: str
    document_title: str
    page: int
    publication_date: str | None = None
    effective_date: str | None = None
    expiry_date: str | None = None
    version: int
    status: DocumentStatus
    source_status: Literal["current", "replaced", "expired", "conflicting"]
    category: str
    # Short quoted excerpt that supports the answer (never fabricated).
    excerpt: str
    open_url: str


class ChatResponse(BaseModel):
    state: AnswerState
    answer: str
    clarification_question: str | None = None
    citations: list[Citation] = Field(default_factory=list)
    knowledge_version: str | None = None
    category: str | None = None
    # True when the answer is based on synthetic demo data.
    is_sample_data: bool = True
    ticket_suggested: bool = False


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------
class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doc_uid: str
    title: str
    category: str
    doc_type: str
    programme: str | None = None
    academic_year: str | None = None
    semester: str | None = None
    subject: str | None = None
    publication_date: str | None = None
    effective_date: str | None = None
    expiry_date: str | None = None
    version: int
    source_page: int | None = None
    status: str
    replaces_document_id: int | None = None
    knowledge_version_id: int | None = None
    created_at: datetime
    published_at: datetime | None = None


class DocumentMetadata(BaseModel):
    """Metadata accepted alongside a document upload."""

    title: str = Field(min_length=3, max_length=255)
    category: Category
    doc_type: Literal["pdf", "faq"] = "pdf"
    programme: str | None = None
    academic_year: str | None = None
    semester: str | None = None
    subject: str | None = None
    publication_date: str | None = None
    effective_date: str | None = None
    expiry_date: str | None = None
    source_page: int | None = None
    replaces_document_id: int | None = None
    body: str | None = Field(
        default=None, description="Raw text for FAQ documents (no file upload)."
    )


class PassageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    page_number: int
    ordinal: int
    content: str


class DocumentDetail(DocumentOut):
    passages: list[PassageOut] = Field(default_factory=list)
    source_status: str = "current"


class ReindexResult(BaseModel):
    document_id: str
    passages_indexed: int
    knowledge_version: str
    message: str


# ---------------------------------------------------------------------------
# Tickets
# ---------------------------------------------------------------------------
class TicketCreate(BaseModel):
    student_name: str | None = Field(default=None, max_length=255)
    contact: str | None = Field(default=None, max_length=255)
    category: Category | str = "College activities"
    programme: str | None = None
    semester: str | None = None
    subject: str | None = None
    description: str = Field(min_length=5, max_length=4000)
    related_document_id: int | None = None


class TicketMessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)
    is_internal: bool = False


class TicketMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author: str
    body: str
    is_internal: bool
    created_at: datetime


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str
    student_name: str | None = None
    contact: str | None = None
    category: str
    programme: str | None = None
    semester: str | None = None
    subject: str | None = None
    description: str
    related_document_id: int | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class TicketDetail(TicketOut):
    messages: list[TicketMessageOut] = Field(default_factory=list)


class TicketStatusUpdate(BaseModel):
    status: TicketStatus


# ---------------------------------------------------------------------------
# Admin overview
# ---------------------------------------------------------------------------
class OverviewStats(BaseModel):
    total_notices: int
    published_notices: int
    replaced_notices: int
    pending_tickets: int
    resolved_tickets: int
    unanswered_categories: dict[str, int]
    active_knowledge_version: str | None = None
    # Always true in the demo build: metrics come from the local sample store.
    is_sample_data: bool = True
