"""
Chat routes — Phase 3 will replace these stubs with the full RAG pipeline.

Current state: All endpoints return placeholder responses.
Every endpoint is auth-protected so the structure is correct from day one.
"""
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from models.user_model import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class ChatRequest(BaseModel):
    query: str
    conversation_id: str | None = None
    document_id: str | None = None     # scope retrieval to a specific document


class RegenerateRequest(BaseModel):
    conversation_id: str
    message_id: str


@router.post("", status_code=200)
async def chat(
    request: ChatRequest,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Chat with the knowledge base via RAG.

    Phase 3 implementation:
    1. Embed the user query via Ollama
    2. Retrieve top-K relevant chunks from Qdrant
       (prioritise document_id scope if provided)
    3. Build a prompt with retrieved context
    4. Generate answer via Ollama LLM (ChatOllama)
    5. Return answer + citations (doc name, page, chunk)
    6. Persist message in PostgreSQL conversation history
    """
    return {
        "answer": "Chat endpoint — Phase 3 coming soon.",
        "citations": [],
        "conversation_id": request.conversation_id,
    }


@router.post("/stream", status_code=200)
async def chat_stream(
    request: ChatRequest,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Streaming chat — returns Server-Sent Events (SSE).
    Phase 3 implementation — requires LangChain streaming chain.
    """
    return {
        "detail": "Streaming endpoint — Phase 3 coming soon."
    }


@router.get("/history", status_code=200)
async def list_conversations(current_user: CurrentUser, db: DbDep):
    """
    List all conversations for the authenticated user.
    Phase 3 implementation.
    """
    return {"conversations": [], "total": 0}


@router.get("/history/{conversation_id}", status_code=200)
async def get_conversation_history(
    conversation_id: str,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Get full message history for a specific conversation.
    Phase 3 implementation.
    """
    return {"messages": [], "conversation_id": conversation_id}


@router.delete("/{conversation_id}", status_code=200)
async def delete_conversation(
    conversation_id: str,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Delete a conversation and all its messages.
    Phase 3 implementation.
    """
    return {"message": "Conversation deleted — Phase 3 coming soon."}


@router.post("/regenerate", status_code=200)
async def regenerate_response(
    request: RegenerateRequest,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Regenerate the last AI response in a conversation.
    Phase 3 implementation.
    """
    return {
        "answer": "Regenerate endpoint — Phase 3 coming soon.",
        "citations": [],
    }


@router.post("/export/{conversation_id}", status_code=200)
async def export_conversation(
    conversation_id: str,
    current_user: CurrentUser,
    db: DbDep,
):
    """
    Export a conversation as a downloadable document (PDF / Markdown).
    Phase 3 implementation.
    """
    return {"export_url": None, "detail": "Export endpoint — Phase 3 coming soon."}
