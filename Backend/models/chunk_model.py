import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class DocumentChunk(Base):
    """
    SQLAlchemy model representing a semantic text chunk of an uploaded document.
    Maps 1-to-1 with vectors/points inside Qdrant Vector Database.
    """
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    document_id: Mapped[str] = mapped_column(
        String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # Chunk details
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-indexed page
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Reference point ID in Qdrant DB
    qdrant_point_id: Mapped[str] = mapped_column(String, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    document = relationship("Document", back_populates="chunks")
