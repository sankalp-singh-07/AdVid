"""
Lightweight in-memory rate limiter.

For multi-instance production, swap the backend store for Redis.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status

from app.config import settings
from utils.logger import get_logger

logger = get_logger("rate_limit")

_lock = Lock()
_buckets: dict[str, deque[float]] = defaultdict(deque)


def _client_key(request: Request, user_id: str | None = None) -> str:
    if user_id:
        return f"user:{user_id}"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return f"ip:{forwarded.split(',')[0].strip()}"
    client = request.client.host if request.client else "unknown"
    return f"ip:{client}"


def check_rate_limit(
    request: Request,
    *,
    scope: str,
    limit: int,
    window_seconds: int = 60,
    user_id: str | None = None,
) -> None:
    if not settings.RATE_LIMIT_ENABLED:
        return

    key = f"{scope}:{_client_key(request, user_id)}"
    now = time.monotonic()
    cutoff = now - window_seconds

    with _lock:
        bucket = _buckets[key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= limit:
            logger.warning("Rate limit exceeded key=%s scope=%s", key, scope)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {scope}. Try again shortly.",
                headers={"Retry-After": str(window_seconds)},
            )
        bucket.append(now)
