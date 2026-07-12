from datetime import datetime

from pydantic import BaseModel, Field


class KnowledgeBaseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    is_default: bool = False


class KnowledgeBaseUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    is_default: bool | None = None


class KnowledgeBaseResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    is_default: bool = False
    document_count: int = 0
    ready_document_count: int = 0
    created_at: datetime
    updated_at: datetime


class KnowledgeBaseListResponse(BaseModel):
    knowledge_bases: list[KnowledgeBaseResponse]
    total: int
