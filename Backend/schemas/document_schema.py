from datetime import datetime

from pydantic import BaseModel, Field


class DocumentResponse(BaseModel):
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
    knowledge_base_id: str | None = None
    progress: int = 0
    stage: str | None = None
    mime_type: str | None = None
    retry_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentUpdateMetadata(BaseModel):
    department: str | None = Field(None, description="Organization department")
    owner: str | None = Field(None, description="Owner name/role")
    knowledge_base_id: str | None = Field(None, description="Move document to KB")


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
    limit: int | None = None
    offset: int | None = None


class DocumentChunkResponse(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    page_number: int
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class SummarizeRequest(BaseModel):
    document_id: str


class SummarizeResponse(BaseModel):
    summary: str


class CompareRequest(BaseModel):
    document_id_1: str
    document_id_2: str


class CompareResponse(BaseModel):
    comparison: str


class GenerateRequest(BaseModel):
    doc_type: str = Field(..., description="faq | policy | sop | meeting_notes")
    instructions: str
    document_id: str | None = None


class GenerateResponse(BaseModel):
    generated_content: str
