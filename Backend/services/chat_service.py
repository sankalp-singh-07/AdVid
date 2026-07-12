import json
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import async_session
from models.chat_model import Conversation, Message
from models.document_model import Document
from services.credit_service import (
    chat_credit_cost,
    deduct_credits,
    require_credits,
)
from services.knowledge_base_service import knowledge_base_service
from services.rag_service import rag_service
from services.redis_service import redis_service
from utils.logger import get_logger

logger = get_logger("chat_service")


class ChatService:
    async def get_or_create_conversation(
        self,
        user_id: str,
        conversation_id: str | None,
        document_id: str | None,
        knowledge_base_id: str | None,
        db: AsyncSession,
        first_query: str,
    ) -> Conversation:
        kb_id = await knowledge_base_service.resolve_kb_id(
            user_id, db, knowledge_base_id
        )

        if conversation_id:
            result = await db.execute(
                select(Conversation).where(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id,
                )
            )
            conv = result.scalars().first()
            if not conv:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found or access denied.",
                )
            if document_id is not None and conv.document_id != document_id:
                conv.document_id = document_id or None
            if knowledge_base_id and conv.knowledge_base_id != kb_id:
                conv.knowledge_base_id = kb_id
            db.add(conv)
            return conv

        title = first_query[:40] + ("..." if len(first_query) > 40 else "")
        if document_id:
            doc_result = await db.execute(
                select(Document).where(
                    Document.id == document_id, Document.user_id == user_id
                )
            )
            doc = doc_result.scalars().first()
            if doc:
                title = f"Doc: {doc.original_filename}"[:80]

        conv = Conversation(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title,
            document_id=document_id,
            knowledge_base_id=kb_id,
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        logger.info("New conversation id=%s kb=%s doc=%s", conv.id, kb_id, document_id)
        return conv

    async def list_conversations(
        self,
        user_id: str,
        db: AsyncSession,
        *,
        knowledge_base_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        conditions = [Conversation.user_id == user_id]
        if knowledge_base_id:
            conditions.append(Conversation.knowledge_base_id == knowledge_base_id)

        result = await db.execute(
            select(Conversation)
            .where(*conditions)
            .order_by(Conversation.updated_at.desc())
            .limit(min(limit, 200))
            .offset(max(offset, 0))
        )
        conversations = result.scalars().all()
        return {"conversations": conversations, "total": len(conversations)}

    async def get_conversation_detail(
        self, conversation_id: str, user_id: str, db: AsyncSession
    ) -> Conversation:
        result = await db.execute(
            select(Conversation)
            .where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
            .options(selectinload(Conversation.messages))
        )
        conv = result.scalars().first()
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied.",
            )
        conv.messages.sort(key=lambda x: x.created_at)
        return conv

    async def delete_conversation(
        self, conversation_id: str, user_id: str, db: AsyncSession
    ) -> None:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
        )
        conv = result.scalars().first()
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied.",
            )
        await redis_service.delete(f"chat:history:{conversation_id}")
        await db.delete(conv)
        await db.commit()

    async def rename_conversation(
        self, conversation_id: str, user_id: str, title: str, db: AsyncSession
    ) -> Conversation:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
        )
        conv = result.scalars().first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        conv.title = title.strip()[:120] or conv.title
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        return conv

    async def get_chat_history_list(
        self, conversation_id: str, db: AsyncSession
    ) -> list[dict]:
        cache_key = f"chat:history:{conversation_id}"
        cached = await redis_service.get(cache_key)
        if cached:
            return cached

        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        messages = result.scalars().all()
        history = [{"role": m.role, "content": m.content} for m in messages]
        await redis_service.set(cache_key, history, ttl=900)
        return history

    async def send_message(
        self,
        query: str,
        conversation_id: str | None,
        document_id: str | None,
        knowledge_base_id: str | None,
        user_id: str,
        db: AsyncSession,
    ) -> dict:
        # Reserve max possible; charge actual after generation
        await require_credits(
            user_id, db, amount=10, action="AI chat (up to 10 credits)"
        )

        conv = await self.get_or_create_conversation(
            user_id=user_id,
            conversation_id=conversation_id,
            document_id=document_id,
            knowledge_base_id=knowledge_base_id,
            db=db,
            first_query=query,
        )
        history = await self.get_chat_history_list(conv.id, db)

        try:
            answer, citations = await rag_service.execute_rag(
                query=query,
                user_id=user_id,
                history=history,
                document_id=document_id or conv.document_id,
                knowledge_base_id=knowledge_base_id or conv.knowledge_base_id,
            )
        except Exception as e:
            logger.error("RAG failed: %s", e, exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI generation failed: {e}",
            ) from e

        cost = chat_credit_cost(answer=answer, citations=citations, query=query)
        user = await require_credits(user_id, db, amount=cost, action="AI chat")
        credits_left = await deduct_credits(
            user, db, cost, reason=f"chat cost={cost} conv={conv.id}"
        )

        user_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role="user",
            content=query,
        )
        assistant_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role="assistant",
            content=answer,
            sources=citations,
        )
        conv.updated_at = datetime.now(timezone.utc)
        db.add(user_msg)
        db.add(assistant_msg)
        db.add(conv)
        await db.commit()
        await redis_service.delete(f"chat:history:{conv.id}")

        return {
            "answer": answer,
            "response": answer,
            "citations": citations,
            "conversation_id": conv.id,
            "message_id": assistant_msg.id,
            "knowledge_base_id": conv.knowledge_base_id,
            "credits_charged": cost,
            "credits_remaining": credits_left,
        }

    async def stream_message(
        self,
        query: str,
        conversation_id: str | None,
        document_id: str | None,
        knowledge_base_id: str | None,
        user_id: str,
        db: AsyncSession | None = None,
    ) -> AsyncIterator[str]:
        async with async_session() as session:
            await require_credits(
                user_id, session, amount=10, action="AI chat (up to 10 credits)"
            )
            conv = await self.get_or_create_conversation(
                user_id=user_id,
                conversation_id=conversation_id,
                document_id=document_id,
                knowledge_base_id=knowledge_base_id,
                db=session,
                first_query=query,
            )
            history = await self.get_chat_history_list(conv.id, session)

            user_msg = Message(
                id=str(uuid.uuid4()),
                conversation_id=conv.id,
                role="user",
                content=query,
            )
            session.add(user_msg)
            await session.commit()

            conv_id = conv.id
            conv_kb = conv.knowledge_base_id
            conv_doc = conv.document_id

            yield _sse(
                {
                    "type": "meta",
                    "conversation_id": conv_id,
                    "knowledge_base_id": conv_kb,
                }
            )

            full_answer = ""
            citations: list = []
            try:
                async for event in rag_service.stream_rag(
                    query=query,
                    user_id=user_id,
                    history=history,
                    document_id=document_id if document_id is not None else conv_doc,
                    knowledge_base_id=knowledge_base_id or conv_kb,
                ):
                    if event["type"] == "citations":
                        citations = event.get("citations") or []
                        yield _sse({"type": "citations", "citations": citations})
                    elif event["type"] == "token":
                        yield _sse(
                            {"type": "token", "content": event.get("content", "")}
                        )
                    elif event["type"] == "done":
                        full_answer = event.get("answer") or full_answer
                        citations = event.get("citations") or citations
            except Exception as e:
                logger.error("Stream RAG failed: %s", e, exc_info=True)
                yield _sse({"type": "error", "detail": str(e)})
                return

            cost = chat_credit_cost(
                answer=full_answer, citations=citations, query=query
            )
            user = await require_credits(user_id, session, amount=cost, action="AI chat")
            credits_left = await deduct_credits(
                user, session, cost, reason=f"stream chat cost={cost} conv={conv_id}"
            )

            result = await session.execute(
                select(Conversation).where(Conversation.id == conv_id)
            )
            conv = result.scalars().first()
            assistant_msg = Message(
                id=str(uuid.uuid4()),
                conversation_id=conv_id,
                role="assistant",
                content=full_answer,
                sources=citations,
            )
            if conv:
                conv.updated_at = datetime.now(timezone.utc)
                session.add(conv)
            session.add(assistant_msg)
            await session.commit()
            await redis_service.delete(f"chat:history:{conv_id}")

            yield _sse(
                {
                    "type": "done",
                    "answer": full_answer,
                    "response": full_answer,
                    "citations": citations,
                    "conversation_id": conv_id,
                    "message_id": assistant_msg.id,
                    "knowledge_base_id": conv_kb,
                    "credits_charged": cost,
                    "credits_remaining": credits_left,
                }
            )

    async def regenerate_message(
        self, conversation_id: str, user_id: str, db: AsyncSession
    ) -> dict:
        await require_credits(
            user_id, db, amount=10, action="AI regenerate (up to 10 credits)"
        )
        conv = await self.get_conversation_detail(conversation_id, user_id, db)
        if not conv.messages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot regenerate message in an empty conversation.",
            )

        messages = sorted(conv.messages, key=lambda x: x.created_at)
        last_assistant_msg = None
        last_user_msg = None

        if messages[-1].role == "assistant":
            last_assistant_msg = messages[-1]
            if len(messages) > 1 and messages[-2].role == "user":
                last_user_msg = messages[-2]
        elif messages[-1].role == "user":
            last_user_msg = messages[-1]

        if not last_user_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not find a user message to regenerate from.",
            )

        cutoff = last_user_msg.created_at
        prior = [m for m in messages if m.created_at < cutoff]
        history = [{"role": m.role, "content": m.content} for m in prior]

        try:
            answer, citations = await rag_service.execute_rag(
                query=last_user_msg.content,
                user_id=user_id,
                history=history,
                document_id=conv.document_id,
                knowledge_base_id=conv.knowledge_base_id,
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI generation failed: {e}",
            ) from e

        cost = chat_credit_cost(
            answer=answer, citations=citations, query=last_user_msg.content
        )
        user = await require_credits(user_id, db, amount=cost, action="AI regenerate")
        credits_left = await deduct_credits(
            user, db, cost, reason=f"regenerate cost={cost} conv={conv.id}"
        )

        if last_assistant_msg:
            await db.delete(last_assistant_msg)

        new_assistant_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role="assistant",
            content=answer,
            sources=citations,
        )
        conv.updated_at = datetime.now(timezone.utc)
        db.add(new_assistant_msg)
        db.add(conv)
        await db.commit()
        await redis_service.delete(f"chat:history:{conv.id}")

        return {
            "answer": answer,
            "response": answer,
            "citations": citations,
            "conversation_id": conv.id,
            "message_id": new_assistant_msg.id,
            "knowledge_base_id": conv.knowledge_base_id,
            "credits_charged": cost,
            "credits_remaining": credits_left,
        }


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, default=str)}\n\n"


chat_service = ChatService()
