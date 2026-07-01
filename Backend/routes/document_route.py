from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from models.user_model import User
from schemas.document_schema import (
    DocumentResponse,
    DocumentListResponse,
    DocumentUpdateMetadata,
)
from services.auth_service import get_current_user
from services.document_service import document_service

router = APIRouter(prefix="/documents", tags=["documents"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/upload", status_code=202, response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DbDep,
    file: UploadFile = File(...),
    department: str | None = Form(None),
    owner: str | None = Form(None),
):
    """
    Upload a document (PDF, DOCX, TXT, MD, PPTX, CSV, Excel) to the platform.
    Initiates asynchronous parsing, chunking, embedding, and vector storage.
    """
    return await document_service.upload_document(
        file=file,
        department=department,
        owner=owner,
        user=current_user,
        db=db,
        background_tasks=background_tasks,
    )


@router.get("", status_code=200, response_model=DocumentListResponse)
async def list_documents(current_user: CurrentUser, db: DbDep):
    """
    List all documents uploaded by the authenticated user.
    """
    return await document_service.list_documents(user=current_user, db=db)


@router.get("/{document_id}", status_code=200, response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Retrieve metadata of a specific document.
    """
    return await document_service.get_document_by_id(
        document_id=document_id,
        user=current_user,
        db=db,
    )


@router.patch("/{document_id}", status_code=200, response_model=DocumentResponse)
async def update_document_metadata(
    document_id: str,
    metadata_data: DocumentUpdateMetadata,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Update a document's department and owner metadata tags.
    """
    return await document_service.update_document_metadata(
        document_id=document_id,
        meta_data=metadata_data,
        user=current_user,
        db=db,
    )


@router.delete("/{document_id}", status_code=200)
async def delete_document(
    document_id: str,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Delete a document from local disk storage, cascade remove its chunks,
    and erase its vectors from Qdrant vector database.
    """
    await document_service.delete_document(
        document_id=document_id,
        user=current_user,
        db=db,
    )
    return {"message": "Document and all associated chunks deleted successfully."}


@router.post("/summarize", status_code=200)
async def summarize_document(current_user: CurrentUser, db: DbDep):
    """
    Generate an AI summary of a document.
    [Phase 4 AI Features]
    """
    return {"summary": "Summarize endpoint — Phase 4 coming soon."}


@router.post("/compare", status_code=200)
async def compare_documents(current_user: CurrentUser, db: DbDep):
    """
    AI-powered comparison of two documents.
    [Phase 4 AI Features]
    """
    return {"comparison": "Compare endpoint — Phase 4 coming soon."}


@router.post("/generate", status_code=200)
async def generate_document(current_user: CurrentUser, db: DbDep):
    """
    Generate a new document (FAQ, Policy, SOP, Meeting Notes).
    [Phase 4 AI Features]
    """
    return {"generated": "Generate endpoint — Phase 4 coming soon."}
