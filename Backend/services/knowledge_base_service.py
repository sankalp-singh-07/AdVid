import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.document_model import Document
from models.knowledge_base_model import KnowledgeBase
from utils.logger import get_logger

logger = get_logger("knowledge_base_service")


class KnowledgeBaseService:
    async def ensure_default_kb(self, user_id: str, db: AsyncSession) -> KnowledgeBase:
        """Create a default knowledge base if the user has none."""
        result = await db.execute(
            select(KnowledgeBase)
            .where(KnowledgeBase.user_id == user_id)
            .order_by(KnowledgeBase.created_at.asc())
        )
        existing = result.scalars().first()
        if existing:
            return existing

        kb = KnowledgeBase(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name="My Knowledge Base",
            description="Default knowledge base for your documents",
            is_default=True,
        )
        db.add(kb)
        await db.commit()
        await db.refresh(kb)
        logger.info("Created default KB %s for user %s", kb.id, user_id)
        return kb

    async def list_knowledge_bases(self, user_id: str, db: AsyncSession) -> dict:
        await self.ensure_default_kb(user_id, db)
        result = await db.execute(
            select(KnowledgeBase)
            .where(KnowledgeBase.user_id == user_id)
            .order_by(KnowledgeBase.updated_at.desc())
        )
        kbs = result.scalars().all()

        items = []
        for kb in kbs:
            count_result = await db.execute(
                select(func.count(Document.id)).where(
                    Document.knowledge_base_id == kb.id,
                    Document.user_id == user_id,
                )
            )
            doc_count = count_result.scalar() or 0
            ready_result = await db.execute(
                select(func.count(Document.id)).where(
                    Document.knowledge_base_id == kb.id,
                    Document.user_id == user_id,
                    Document.status == "ready",
                )
            )
            ready_count = ready_result.scalar() or 0
            items.append(
                {
                    "id": kb.id,
                    "name": kb.name,
                    "description": kb.description,
                    "is_default": kb.is_default,
                    "document_count": doc_count,
                    "ready_document_count": ready_count,
                    "created_at": kb.created_at,
                    "updated_at": kb.updated_at,
                }
            )
        return {"knowledge_bases": items, "total": len(items)}

    async def create_knowledge_base(
        self,
        user_id: str,
        name: str,
        description: str | None,
        db: AsyncSession,
        is_default: bool = False,
    ) -> KnowledgeBase:
        if is_default:
            await self._clear_default(user_id, db)

        kb = KnowledgeBase(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=name.strip() or "Untitled Knowledge Base",
            description=description,
            is_default=is_default,
        )
        db.add(kb)
        await db.commit()
        await db.refresh(kb)
        return kb

    async def get_knowledge_base(
        self, kb_id: str, user_id: str, db: AsyncSession
    ) -> KnowledgeBase:
        result = await db.execute(
            select(KnowledgeBase).where(
                KnowledgeBase.id == kb_id, KnowledgeBase.user_id == user_id
            )
        )
        kb = result.scalars().first()
        if not kb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Knowledge base not found.",
            )
        return kb

    async def update_knowledge_base(
        self,
        kb_id: str,
        user_id: str,
        db: AsyncSession,
        name: str | None = None,
        description: str | None = None,
        is_default: bool | None = None,
    ) -> KnowledgeBase:
        kb = await self.get_knowledge_base(kb_id, user_id, db)
        if name is not None:
            kb.name = name.strip()
        if description is not None:
            kb.description = description
        if is_default is True:
            await self._clear_default(user_id, db)
            kb.is_default = True
        elif is_default is False:
            kb.is_default = False
        db.add(kb)
        await db.commit()
        await db.refresh(kb)
        return kb

    async def delete_knowledge_base(
        self, kb_id: str, user_id: str, db: AsyncSession
    ) -> None:
        kb = await self.get_knowledge_base(kb_id, user_id, db)
        # Prevent deleting last KB
        count_result = await db.execute(
            select(func.count(KnowledgeBase.id)).where(
                KnowledgeBase.user_id == user_id
            )
        )
        if (count_result.scalar() or 0) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your only knowledge base.",
            )
        await db.delete(kb)
        await db.commit()

    async def resolve_kb_id(
        self,
        user_id: str,
        db: AsyncSession,
        knowledge_base_id: str | None = None,
    ) -> str:
        """Return a valid KB id for the user (default if none provided)."""
        if knowledge_base_id:
            kb = await self.get_knowledge_base(knowledge_base_id, user_id, db)
            return kb.id
        default = await self.ensure_default_kb(user_id, db)
        # Prefer is_default flag
        result = await db.execute(
            select(KnowledgeBase).where(
                KnowledgeBase.user_id == user_id, KnowledgeBase.is_default.is_(True)
            )
        )
        flagged = result.scalars().first()
        return flagged.id if flagged else default.id

    async def _clear_default(self, user_id: str, db: AsyncSession) -> None:
        result = await db.execute(
            select(KnowledgeBase).where(
                KnowledgeBase.user_id == user_id, KnowledgeBase.is_default.is_(True)
            )
        )
        for kb in result.scalars().all():
            kb.is_default = False
            db.add(kb)


knowledge_base_service = KnowledgeBaseService()
