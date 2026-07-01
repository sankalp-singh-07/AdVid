import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


class Conversation(Base):
    """
    SQLAlchemy model representing a chat session or thread.
    Can be scoped optionally to a specific document.
    """
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False, default="New Conversation")

    # Optional: restricts conversation search to this specific document
    document_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    """
    SQLAlchemy model representing a single message in a conversation.
    Supports storing text content and retrieved RAG source citations.
    """
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    conversation_id: Mapped[str] = mapped_column(
        String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    # role: "user" | "assistant" | "system"
    role: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Citations metadata: [{"filename": "doc.pdf", "page": 4, "score": 0.87, "content": "..."}]
    sources: Mapped[list | dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
