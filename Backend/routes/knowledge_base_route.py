from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from models.user_model import User
from schemas.knowledge_base_schema import (
    KnowledgeBaseCreate,
    KnowledgeBaseListResponse,
    KnowledgeBaseUpdate,
)
from services.auth_service import get_current_user
from services.knowledge_base_service import knowledge_base_service

router = APIRouter(prefix="/knowledge-bases", tags=["knowledge-bases"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=KnowledgeBaseListResponse)
async def list_knowledge_bases(current_user: CurrentUser, db: DbDep):
    return await knowledge_base_service.list_knowledge_bases(current_user.id, db)


@router.post("", status_code=201)
async def create_knowledge_base(
    body: KnowledgeBaseCreate, current_user: CurrentUser, db: DbDep
):
    kb = await knowledge_base_service.create_knowledge_base(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        db=db,
        is_default=body.is_default,
    )
    return {
        "id": kb.id,
        "name": kb.name,
        "description": kb.description,
        "is_default": kb.is_default,
        "document_count": 0,
        "ready_document_count": 0,
        "created_at": kb.created_at,
        "updated_at": kb.updated_at,
    }


@router.get("/{kb_id}")
async def get_knowledge_base(kb_id: str, current_user: CurrentUser, db: DbDep):
    kb = await knowledge_base_service.get_knowledge_base(kb_id, current_user.id, db)
    listing = await knowledge_base_service.list_knowledge_bases(current_user.id, db)
    for item in listing["knowledge_bases"]:
        if item["id"] == kb.id:
            return item
    return kb


@router.patch("/{kb_id}")
async def update_knowledge_base(
    kb_id: str, body: KnowledgeBaseUpdate, current_user: CurrentUser, db: DbDep
):
    kb = await knowledge_base_service.update_knowledge_base(
        kb_id=kb_id,
        user_id=current_user.id,
        db=db,
        name=body.name,
        description=body.description,
        is_default=body.is_default,
    )
    return {
        "id": kb.id,
        "name": kb.name,
        "description": kb.description,
        "is_default": kb.is_default,
        "created_at": kb.created_at,
        "updated_at": kb.updated_at,
    }


@router.delete("/{kb_id}")
async def delete_knowledge_base(kb_id: str, current_user: CurrentUser, db: DbDep):
    await knowledge_base_service.delete_knowledge_base(kb_id, current_user.id, db)
    return {"message": "Knowledge base deleted."}
