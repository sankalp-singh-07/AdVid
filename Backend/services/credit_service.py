"""
Credit billing helpers.

Upload: fixed cost (default 3).
Chat: dynamic 5–10 based on answer length + retrieved sources.
"""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from models.user_model import User
from utils.logger import get_logger

logger = get_logger("credit_service")

def upload_credit_cost() -> int:
    return int(getattr(settings, "CREDIT_COST_UPLOAD", 3) or 3)


def chat_credit_cost(
    *,
    answer: str,
    citations: list | None = None,
    query: str | None = None,
) -> int:
    """
    Score chat usage into [min, max] from settings (default 5–10).

    Factors:
    - answer length (approx. words)
    - number of distinct source documents retrieved
    - number of citation chunks
    """
    lo = int(getattr(settings, "CREDIT_COST_CHAT_MIN", 5) or 5)
    hi = int(getattr(settings, "CREDIT_COST_CHAT_MAX", 10) or 10)
    if hi < lo:
        hi = lo

    text = answer or ""
    words = max(1, len(text.split()))
    cites = citations or []
    chunk_count = len(cites)
    doc_ids = {
        (c.get("document_id") or c.get("filename") or c.get("title"))
        for c in cites
        if isinstance(c, dict)
    }
    doc_count = len(doc_ids) if doc_ids else (1 if cites else 0)

    cost = lo

    if words > 80:
        cost += 1
    if words > 200:
        cost += 1
    if words > 400:
        cost += 1

    if chunk_count >= 3:
        cost += 1
    if doc_count >= 2:
        cost += 1
    if doc_count >= 4:
        cost += 1

    if query and len(query.split()) > 40:
        cost += 1

    return max(lo, min(hi, cost))


async def get_user(user_id: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )
    return user


async def require_credits(
    user_id: str, db: AsyncSession, amount: int, *, action: str = "this action"
) -> User:
    user = await get_user(user_id, db)
    if user.credits < amount:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"Insufficient credits for {action}. "
                f"Required: {amount}, available: {user.credits}."
            ),
        )
    return user


async def deduct_credits(
    user: User, db: AsyncSession, amount: int, *, reason: str = ""
) -> int:
    before = user.credits
    user.credits = max(0, user.credits - amount)
    db.add(user)
    logger.info(
        "Credits deducted user=%s amount=%d before=%d after=%d reason=%s",
        user.id,
        amount,
        before,
        user.credits,
        reason,
    )
    return user.credits
