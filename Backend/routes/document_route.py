from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    Query,
    Request,
    UploadFile,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from models.chat_model import Conversation
from models.document_model import Document
from models.user_model import User
from schemas.document_schema import (
    CompareRequest,
    CompareResponse,
    DocumentListResponse,
    DocumentResponse,
    DocumentUpdateMetadata,
    GenerateRequest,
    GenerateResponse,
    SummarizeRequest,
    SummarizeResponse,
)
from services.ai_features_service import ai_features_service
from services.auth_service import get_current_user
from services.document_service import document_service
from utils.rate_limit import check_rate_limit

router = APIRouter(prefix="/documents", tags=["documents"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/upload", status_code=202, response_model=DocumentResponse)
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DbDep,
    file: UploadFile = File(...),
    department: str | None = Form(None),
    owner: str | None = Form(None),
    knowledge_base_id: str | None = Form(None),
):
    check_rate_limit(
        request,
        scope="upload",
        limit=settings.RATE_LIMIT_UPLOAD_PER_MINUTE,
        user_id=current_user.id,
    )
    return await document_service.upload_document(
        file=file,
        department=department,
        owner=owner,
        user=current_user,
        db=db,
        background_tasks=background_tasks,
        knowledge_base_id=knowledge_base_id,
    )


@router.get("/dashboard/stats", status_code=200)
async def get_dashboard_stats(current_user: CurrentUser, db: DbDep):
    """Registered before /{document_id} so path is not captured as an id."""
    doc_res = await db.execute(
        select(func.count(Document.id)).where(Document.user_id == current_user.id)
    )
    total_docs = doc_res.scalar() or 0
    ready_res = await db.execute(
        select(func.count(Document.id)).where(
            Document.user_id == current_user.id, Document.status == "ready"
        )
    )
    ready_docs = ready_res.scalar() or 0
    conv_res = await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.user_id == current_user.id
        )
    )
    total_convs = conv_res.scalar() or 0
    return {
        "total_documents": total_docs,
        "ready_documents": ready_docs,
        "total_conversations": total_convs,
        "credits": getattr(current_user, "credits", 0),
        "system_health": "ok",
    }


@router.get("", status_code=200, response_model=DocumentListResponse)
async def list_documents(
    current_user: CurrentUser,
    db: DbDep,
    knowledge_base_id: str | None = Query(None),
    search: str | None = Query(None),
    department: str | None = Query(None),
    status: str | None = Query(None, alias="status"),
    file_type: str | None = Query(None),
    owner: str | None = Query(None),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    return await document_service.list_documents(
        user=current_user,
        db=db,
        knowledge_base_id=knowledge_base_id,
        search=search,
        department=department,
        status_filter=status,
        file_type=file_type,
        owner=owner,
        sort_by=sort_by,
        sort_dir=sort_dir,
        limit=limit,
        offset=offset,
    )


@router.get("/{document_id}", status_code=200, response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: CurrentUser,
    db: DbDep,
):
    return await document_service.get_document_by_id(
        document_id=document_id, user=current_user, db=db
    )


@router.patch("/{document_id}", status_code=200, response_model=DocumentResponse)
async def update_document_metadata(
    document_id: str,
    metadata_data: DocumentUpdateMetadata,
    current_user: CurrentUser,
    db: DbDep,
):
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
    await document_service.delete_document(
        document_id=document_id, user=current_user, db=db
    )
    return {"message": "Document and all associated chunks deleted successfully."}


@router.post("/{document_id}/retry", status_code=202, response_model=DocumentResponse)
async def retry_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DbDep,
):
    return await document_service.retry_ingestion(
        document_id=document_id,
        user=current_user,
        db=db,
        background_tasks=background_tasks,
    )


@router.post("/{document_id}/cancel", status_code=200, response_model=DocumentResponse)
async def cancel_document(
    document_id: str,
    current_user: CurrentUser,
    db: DbDep,
):
    return await document_service.cancel_ingestion(
        document_id=document_id, user=current_user, db=db
    )


@router.post("/summarize", status_code=200, response_model=SummarizeResponse)
async def summarize_document(
    body: SummarizeRequest,
    current_user: CurrentUser,
    db: DbDep,
):
    summary = await ai_features_service.summarize_document(
        document_id=body.document_id,
        user_id=str(current_user.id),
        db=db,
    )
    return SummarizeResponse(summary=summary)


@router.post("/compare", status_code=200, response_model=CompareResponse)
async def compare_documents(
    body: CompareRequest,
    current_user: CurrentUser,
    db: DbDep,
):
    comparison = await ai_features_service.compare_documents(
        doc_id_1=body.document_id_1,
        doc_id_2=body.document_id_2,
        user_id=str(current_user.id),
        db=db,
    )
    return CompareResponse(comparison=comparison)


@router.post("/generate", status_code=200, response_model=GenerateResponse)
async def generate_document(
    body: GenerateRequest,
    current_user: CurrentUser,
    db: DbDep,
):
    content = await ai_features_service.generate_document(
        doc_type=body.doc_type,
        instructions=body.instructions,
        document_id=body.document_id,
        user_id=str(current_user.id),
        db=db,
    )
    return GenerateResponse(generated_content=content)
