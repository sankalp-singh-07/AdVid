import uuid
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.chat_model import Conversation, Message
from models.document_model import Document
from models.user_model import User
from services.rag_service import rag_service
from services.redis_service import redis_service
from utils.logger import get_logger

logger = get_logger("chat_service")


class ChatService:
    """
    Handles all business logic for conversations, chat history, message persistence,
    and RAG execution coordination.
    """

    async def get_or_create_conversation(
        self,
        user_id: str,
        conversation_id: str | None,
        document_id: str | None,
        db: AsyncSession,
        first_query: str
    ) -> Conversation:
        """
        Retrieves a conversation or creates a new one with a smart generated title.
        """
        if conversation_id:
            # Fetch existing conversation
            result = await db.execute(
                select(Conversation).where(
                    Conversation.id == conversation_id, 
                    Conversation.user_id == user_id
                )
            )
            conv = result.scalars().first()
            if not conv:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found or access denied.",
                )
            
            # If scoped document changed, update it
            if document_id and conv.document_id != document_id:
                conv.document_id = document_id
                db.add(conv)
            return conv

        # Generate a smart default title (truncating first query)
        title = first_query[:40] + "..." if len(first_query) > 40 else first_query
        
        # If scoped to a specific document, include document context in title
        if document_id:
            doc_result = await db.execute(
                select(Document).where(Document.id == document_id, Document.user_id == user_id)
            )
            doc = doc_result.scalars().first()
            if doc:
                title = f"Doc: {doc.original_filename}"

        conv = Conversation(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title,
            document_id=document_id
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        logger.info("New conversation initialized: id=%s, title='%s'", conv.id, title)
        return conv

    async def list_conversations(self, user_id: str, db: AsyncSession) -> dict:
        """
        Returns all conversations for a user ordered by last updated.
        """
        result = await db.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
        )
        conversations = result.scalars().all()
        return {
            "conversations": conversations,
            "total": len(conversations)
        }

    async def get_conversation_detail(
        self, 
        conversation_id: str, 
        user_id: str, 
        db: AsyncSession
    ) -> Conversation:
        """
        Fetches full conversation session detail including all historical messages.
        """
        result = await db.execute(
            select(Conversation)
            .where(Conversation.id == conversation_id, Conversation.user_id == user_id)
            .options(selectinload(Conversation.messages))
        )
        conv = result.scalars().first()
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied.",
            )
        
        # Sort messages chronologically
        conv.messages.sort(key=lambda x: x.created_at)
        return conv

    async def delete_conversation(self, conversation_id: str, user_id: str, db: AsyncSession) -> None:
        """
        Deletes a conversation and cascade removes all messages.
        Clears associated cache keys if Redis is configured.
        """
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id, 
                Conversation.user_id == user_id
            )
        )
        conv = result.scalars().first()
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied.",
            )

        # Clear Redis cache if exists
        cache_key = f"chat:history:{conversation_id}"
        await redis_service.delete(cache_key)

        await db.delete(conv)
        await db.commit()
        logger.info("Deleted conversation session: id=%s", conversation_id)

    async def get_chat_history_list(self, conversation_id: str, db: AsyncSession) -> list[dict]:
        """
        Helper that builds a clean list of history messages dicts for RAG context window.
        Uses Redis caching to avoid database queries on quick conversational turns.
        """
        cache_key = f"chat:history:{conversation_id}"
        
        # Check cache
        cached_history = await redis_service.get(cache_key)
        if cached_history:
            logger.info("Cache hit: retrieved chat history for session %s", conversation_id)
            return cached_history

        # Fetch from DB
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        messages = result.scalars().all()
        
        history = []
        for msg in messages:
            history.append({
                "role": msg.role,
                "content": msg.content
            })
            
        # Cache results for 15 minutes
        await redis_service.set(cache_key, history, ttl=900)
        return history

    async def send_message(
        self,
        query: str,
        conversation_id: str | None,
        document_id: str | None,
        user_id: str,
        db: AsyncSession
    ) -> dict:
        """
        Primary execution thread. Resolves conversation thread, gathers history,
        runs query through RAG pipeline, saves messages, and returns answer with citations.
        """
        # 0. Check and deduct credits
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalars().first()
        if not user or user.credits < 1:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits for AI Chat.")
        user.credits -= 1
        db.add(user)

        # 1. Resolve conversation thread
        conv = await self.get_or_create_conversation(
            user_id=user_id,
            conversation_id=conversation_id,
            document_id=document_id,
            db=db,
            first_query=query
        )

        # 2. Gather conversation history
        history = await self.get_chat_history_list(conv.id, db)

        # 3. Execute RAG pipeline
        answer, citations = await rag_service.execute_rag(
            query=query,
            user_id=user_id,
            history=history,
            document_id=document_id or conv.document_id
        )

        # 4. Save User Message
        user_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role="user",
            content=query
        )
        db.add(user_msg)

        # 5. Save Assistant Message (with source citations)
        assistant_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role="assistant",
            content=answer,
            sources=citations
        )
        db.add(assistant_msg)

        # 6. Update conversation timestamp
        conv.updated_at = datetime.now(timezone.utc)
        db.add(conv)
        
        await db.commit()

        # Invalidate/update Redis history cache
        cache_key = f"chat:history:{conv.id}"
        await redis_service.delete(cache_key)

        return {
            "answer": answer,
            "citations": citations,
            "conversation_id": conv.id,
            "message_id": assistant_msg.id
        }

    async def regenerate_message(
        self,
        conversation_id: str,
        user_id: str,
        db: AsyncSession
    ) -> dict:
        """
        Erases the last assistant response, retrieves the last user prompt,
        re-runs retrieval/generation, and saves the new answer.
        """
        # 0. Check and deduct credits
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalars().first()
        if not user or user.credits < 1:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits to regenerate message.")
        user.credits -= 1
        db.add(user)

        # 1. Fetch conversation
        conv = await self.get_conversation_detail(conversation_id, user_id, db)
        if not conv.messages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot regenerate message in an empty conversation."
            )

        # Find the last assistant message and last user message
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
                detail="Could not find a user message to regenerate from."
            )

        # Build query history prior to the regenerated turn
        cutoff = last_user_msg.created_at
        prior_messages = [m for m in messages if m.created_at < cutoff]
        
        history = []
        for msg in prior_messages:
            history.append({
                "role": msg.role,
                "content": msg.content
            })

        # Re-run RAG pipeline on last query
        answer, citations = await rag_service.execute_rag(
            query=last_user_msg.content,
            user_id=user_id,
            history=history,
            document_id=conv.document_id
        )

        # Delete the obsolete assistant response if one exists
        if last_assistant_msg:
            await db.delete(last_assistant_msg)

        # Save new assistant message
        new_assistant_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role="assistant",
            content=answer,
            sources=citations
        )
        db.add(new_assistant_msg)

        # Update conversation timestamp
        conv.updated_at = datetime.now(timezone.utc)
        db.add(conv)

        await db.commit()

        # Invalidate Redis cache
        cache_key = f"chat:history:{conv.id}"
        await redis_service.delete(cache_key)

        return {
            "answer": answer,
            "citations": citations,
            "conversation_id": conv.id,
            "message_id": new_assistant_msg.id
        }


chat_service = ChatService()
