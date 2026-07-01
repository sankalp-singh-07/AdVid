from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from models.user_model import User
from schemas.chat_schema import (
    ChatRequest,
    ChatResponse,
    ConversationDetailResponse,
    RegenerateRequest,
)
from services.auth_service import get_current_user
from services.chat_service import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("", status_code=200, response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Interact with the RAG pipeline.
    Submits user query, pulls context from vector database, formats LLM prompt,
    persist conversation thread in database, and returns the response with citations.
    """
    return await chat_service.send_message(
        query=request.query,
        conversation_id=request.conversation_id,
        document_id=request.document_id,
        user_id=current_user.id,
        db=db,
    )


@router.get("/history", status_code=200)
async def list_conversations(current_user: CurrentUser, db: DbDep):
    """
    List all conversation sessions belonging to the authenticated user.
    """
    return await chat_service.list_conversations(user_id=current_user.id, db=db)


@router.get("/history/{conversation_id}", status_code=200, response_model=ConversationDetailResponse)
async def get_conversation_history(
    conversation_id: str,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Retrieve message history for a specific conversation session.
    """
    return await chat_service.get_conversation_detail(
        conversation_id=conversation_id,
        user_id=current_user.id,
        db=db,
    )


@router.delete("/{conversation_id}", status_code=200)
async def delete_conversation(
    conversation_id: str,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Delete a conversation thread and delete all cascade messages.
    """
    await chat_service.delete_conversation(
        conversation_id=conversation_id,
        user_id=current_user.id,
        db=db,
    )
    return {"message": "Conversation session deleted successfully."}


@router.post("/regenerate", status_code=200, response_model=ChatResponse)
async def regenerate_response(
    request: RegenerateRequest,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Re-evaluates the prompt on the last user message, deletes the former assistant
    response, and saves/returns the new generated response.
    """
    return await chat_service.regenerate_message(
        conversation_id=request.conversation_id,
        user_id=current_user.id,
        db=db,
    )


@router.post("/stream", status_code=200)
async def chat_stream(
    request: ChatRequest,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Streaming chat endpoint returning Server-Sent Events (SSE).
    Phase 3 stub: routes standard chat service synchronously.
    """
    return await chat_service.send_message(
        query=request.query,
        conversation_id=request.conversation_id,
        document_id=request.document_id,
        user_id=current_user.id,
        db=db,
    )


@router.post("/export/{conversation_id}", status_code=200)
async def export_conversation(
    conversation_id: str,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Export conversation history format.
    [Phase 4 AI Features]
    """
    return {"export_url": None, "detail": "Export endpoint — Phase 4 coming soon."}
