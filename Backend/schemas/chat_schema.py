from datetime import datetime
from pydantic import BaseModel, Field


class Citation(BaseModel):
    """Schema representing retrieved chunk sources for citation formatting."""
    filename: str
    page: int
    score: float
    content: str
    document_id: str | None = None


class ChatRequest(BaseModel):
    """Schema for incoming user chat query."""
    query: str = Field(..., min_length=1, description="The user's query or prompt")
    conversation_id: str | None = Field(None, description="The session ID. If null, a new conversation is initialized.")
    document_id: str | None = Field(None, description="If provided, scopes retrieval to this document first.")


class ChatResponse(BaseModel):
    """Schema for RAG chat pipeline responses."""
    answer: str
    citations: list[Citation]
    conversation_id: str
    message_id: str


class MessageResponse(BaseModel):
    """Schema for individual message history."""
    id: str
    role: str
    content: str
    sources: list[Citation] | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    """Schema for session list view."""
    id: str
    title: str
    document_id: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationDetailResponse(ConversationResponse):
    """Schema for full message context list."""
    messages: list[MessageResponse]


class RegenerateRequest(BaseModel):
    """Schema for regenerating the last assistant response."""
    conversation_id: str = Field(..., description="The ID of the conversation to regenerate in.")
