from datetime import datetime

from pydantic import BaseModel, Field


class Citation(BaseModel):
    filename: str
    page: int
    score: float
    content: str
    document_id: str | None = None
    # Frontend-friendly aliases
    title: str | None = None
    excerpt: str | None = None
    confidence: int | None = None


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=8000)
    conversation_id: str | None = None
    document_id: str | None = Field(
        None, description="Optional single-document filter within the KB"
    )
    knowledge_base_id: str | None = Field(
        None, description="Active knowledge base (defaults to user's default KB)"
    )


class ChatResponse(BaseModel):
    answer: str
    response: str | None = None  # alias
    citations: list[Citation]
    conversation_id: str
    message_id: str
    knowledge_base_id: str | None = None


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    sources: list[Citation] | None = None
    # Alias so frontend can use either field
    citations: list[Citation] | None = None
    created_at: datetime

    class Config:
        from_attributes = True

    def model_post_init(self, __context) -> None:
        if self.citations is None and self.sources is not None:
            object.__setattr__(self, "citations", self.sources)
        if self.sources is None and self.citations is not None:
            object.__setattr__(self, "sources", self.citations)


class ConversationResponse(BaseModel):
    id: str
    title: str
    document_id: str | None = None
    knowledge_base_id: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationDetailResponse(ConversationResponse):
    messages: list[MessageResponse]


class RegenerateRequest(BaseModel):
    conversation_id: str


class RenameConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)


class ExportRequest(BaseModel):
    format: str = Field("markdown", description="markdown | md | txt | pdf")
