from datetime import datetime
from pydantic import BaseModel, Field


class DocumentResponse(BaseModel):
    """Schema representing document details in API responses."""
    id: str
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    status: str
    chunk_count: int
    error_message: str | None = None
    department: str | None = None
    owner: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentUpdateMetadata(BaseModel):
    """Schema for updating document metadata via PATCH."""
    department: str | None = Field(None, description="Organization department owning this document")
    owner: str | None = Field(None, description="Organization user/role owning this document")


class DocumentListResponse(BaseModel):
    """Schema for a paginated list of documents."""
    documents: list[DocumentResponse]
    total: int


class DocumentChunkResponse(BaseModel):
    """Schema representing a single document chunk."""
    id: str
    document_id: str
    chunk_index: int
    page_number: int
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
