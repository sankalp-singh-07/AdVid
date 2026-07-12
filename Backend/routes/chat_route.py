from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from models.user_model import User
from schemas.chat_schema import (
    ChatRequest,
    ChatResponse,
    ConversationDetailResponse,
    ExportRequest,
    RegenerateRequest,
    RenameConversationRequest,
)
from services.auth_service import get_current_user
from services.chat_service import chat_service
from services.export_service import export_service
from utils.rate_limit import check_rate_limit

router = APIRouter(prefix="/chat", tags=["chat"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("", status_code=200, response_model=ChatResponse)
async def chat(
    request: Request,
    body: ChatRequest,
    current_user: CurrentUser,
    db: DbDep,
):
    check_rate_limit(
        request,
        scope="chat",
        limit=settings.RATE_LIMIT_CHAT_PER_MINUTE,
        user_id=current_user.id,
    )
    return await chat_service.send_message(
        query=body.query,
        conversation_id=body.conversation_id,
        document_id=body.document_id,
        knowledge_base_id=body.knowledge_base_id,
        user_id=current_user.id,
        db=db,
    )


@router.post("/stream")
async def chat_stream(
    request: Request,
    body: ChatRequest,
    current_user: CurrentUser,
):
    """Server-Sent Events streaming chat (owns its DB session inside the generator)."""
    check_rate_limit(
        request,
        scope="chat",
        limit=settings.RATE_LIMIT_CHAT_PER_MINUTE,
        user_id=current_user.id,
    )

    user_id = current_user.id

    async def event_generator():
        async for chunk in chat_service.stream_message(
            query=body.query,
            conversation_id=body.conversation_id,
            document_id=body.document_id,
            knowledge_base_id=body.knowledge_base_id,
            user_id=user_id,
        ):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history", status_code=200)
async def list_conversations(
    current_user: CurrentUser,
    db: DbDep,
    knowledge_base_id: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    return await chat_service.list_conversations(
        user_id=current_user.id,
        db=db,
        knowledge_base_id=knowledge_base_id,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/history/{conversation_id}",
    status_code=200,
    response_model=ConversationDetailResponse,
)
async def get_conversation_history(
    conversation_id: str,
    current_user: CurrentUser,
    db: DbDep,
):
    conv = await chat_service.get_conversation_detail(
        conversation_id=conversation_id,
        user_id=current_user.id,
        db=db,
    )
    # Normalize message sources → citations for API consumers
    messages = []
    for m in conv.messages:
        messages.append(
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "sources": m.sources,
                "citations": m.sources,
                "created_at": m.created_at,
            }
        )
    return {
        "id": conv.id,
        "title": conv.title,
        "document_id": conv.document_id,
        "knowledge_base_id": conv.knowledge_base_id,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "messages": messages,
    }


@router.patch("/history/{conversation_id}")
async def rename_conversation(
    conversation_id: str,
    body: RenameConversationRequest,
    current_user: CurrentUser,
    db: DbDep,
):
    conv = await chat_service.rename_conversation(
        conversation_id, current_user.id, body.title, db
    )
    return {"id": conv.id, "title": conv.title}


@router.delete("/{conversation_id}", status_code=200)
async def delete_conversation(
    conversation_id: str,
    current_user: CurrentUser,
    db: DbDep,
):
    await chat_service.delete_conversation(
        conversation_id=conversation_id,
        user_id=current_user.id,
        db=db,
    )
    return {"message": "Conversation session deleted successfully."}


@router.post("/regenerate", status_code=200, response_model=ChatResponse)
async def regenerate_response(
    request: Request,
    body: RegenerateRequest,
    current_user: CurrentUser,
    db: DbDep,
):
    check_rate_limit(
        request,
        scope="chat",
        limit=settings.RATE_LIMIT_CHAT_PER_MINUTE,
        user_id=current_user.id,
    )
    return await chat_service.regenerate_message(
        conversation_id=body.conversation_id,
        user_id=current_user.id,
        db=db,
    )


@router.post("/export/{conversation_id}")
async def export_conversation(
    conversation_id: str,
    body: ExportRequest,
    current_user: CurrentUser,
    db: DbDep,
):
    conv = await export_service.get_conversation(
        conversation_id, current_user.id, db
    )
    fmt = (body.format or "markdown").lower().strip()

    if fmt in ("md", "markdown"):
        content = export_service.to_markdown(conv)
        return Response(
            content=content,
            media_type="text/markdown; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="conversation-{conversation_id[:8]}.md"'
            },
        )
    if fmt == "txt":
        content = export_service.to_txt(conv)
        return Response(
            content=content,
            media_type="text/plain; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="conversation-{conversation_id[:8]}.txt"'
            },
        )
    if fmt == "pdf":
        pdf_bytes = export_service.to_pdf_bytes(conv)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="conversation-{conversation_id[:8]}.pdf"'
            },
        )

    return {"detail": f"Unsupported format '{fmt}'. Use markdown, txt, or pdf."}
