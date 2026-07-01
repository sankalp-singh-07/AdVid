"""
Document routes — Phase 2 will replace these stubs with real implementations.

Current state: All endpoints return placeholder responses.
Every endpoint is auth-protected so the structure is correct from day one.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from models.user_model import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/documents", tags=["documents"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/upload", status_code=202)
async def upload_document(
    current_user: CurrentUser,
    db: DbDep,
    file: UploadFile = File(...),
):
    """
    Upload a document to the knowledge base.

    Phase 2 implementation:
    1. Validate file type and size
    2. Save file to local storage (STORAGE_PATH)
    3. Extract text (PDF/DOCX/TXT/PPTX/CSV/Excel)
    4. Split into semantic chunks via LangChain
    5. Generate embeddings via Ollama (nomic-embed-text)
    6. Store vectors in Qdrant with metadata
    7. Save document record in PostgreSQL
    """
    return {
        "message": "Document upload endpoint — Phase 2 coming soon.",
        "filename": file.filename,
        "uploaded_by": current_user.id,
    }


@router.get("", status_code=200)
async def list_documents(current_user: CurrentUser, db: DbDep):
    """
    List all documents belonging to the authenticated user.

    Phase 2 implementation:
    - Query PostgreSQL for user's documents with status and metadata
    """
    return {"documents": [], "total": 0}


@router.get("/{document_id}", status_code=200)
async def get_document(
    document_id: str,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Get a specific document by ID.

    Phase 2 implementation:
    - Fetch document record from PostgreSQL
    - Return metadata + chunk count + status
    """
    return {"document": None}


@router.delete("/{document_id}", status_code=200)
async def delete_document(
    document_id: str,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Delete a document and all its associated chunks/vectors.

    Phase 2 implementation:
    - Delete vectors from Qdrant (filter by document_id)
    - Delete file from local storage
    - Delete PostgreSQL record
    """
    return {"message": "Delete endpoint — Phase 2 coming soon."}


@router.patch("/{document_id}", status_code=200)
async def update_document_metadata(
    document_id: str,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Update document metadata (title, department, tags).

    Phase 2 implementation:
    - Update PostgreSQL record
    - Re-index with updated metadata in Qdrant
    """
    return {"message": "Update endpoint — Phase 2 coming soon."}


@router.post("/summarize", status_code=200)
async def summarize_document(current_user: CurrentUser, db: DbDep):
    """
    Generate an AI summary of a document.
    Phase 4 implementation — requires Phase 3 (RAG) to be complete first.
    """
    return {"summary": "Summarize endpoint — Phase 4 coming soon."}


@router.post("/compare", status_code=200)
async def compare_documents(current_user: CurrentUser, db: DbDep):
    """
    AI-powered comparison of two documents.
    Phase 4 implementation.
    """
    return {"comparison": "Compare endpoint — Phase 4 coming soon."}


@router.post("/generate", status_code=200)
async def generate_document(current_user: CurrentUser, db: DbDep):
    """
    Generate a new document (FAQ, Policy, SOP, Meeting Notes).
    Phase 4 implementation.
    """
    return {"generated": "Generate endpoint — Phase 4 coming soon."}
