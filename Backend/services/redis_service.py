"""
Redis cache with multi-strategy connection:

1. REDIS_URL (redis:// or rediss://) — preferred, works with Upstash TCP
2. Upstash REST (UPSTASH_REDIS_REST_URL + TOKEN) if upstash-redis is installed
3. Graceful cache-bypass if both fail

Never hard-crashes the app when Redis is unavailable.
"""

from __future__ import annotations

import json
import ssl

import redis.asyncio as aioredis

from app.config import settings
from utils.logger import get_logger

logger = get_logger("redis_service")


class RedisService:
    def __init__(self) -> None:
        self.redis_url = settings.REDIS_URL
        self.upstash_url = settings.UPSTASH_REDIS_REST_URL
        self.upstash_token = settings.UPSTASH_REDIS_REST_TOKEN
        self.client = None
        self.is_connected = False
        self.mode: str | None = None  # "redis" | "upstash_rest"

        if self.redis_url:
            logger.info("RedisService will try REDIS_URL first")
        elif self.upstash_url and self.upstash_token:
            logger.info("RedisService will try Upstash REST: %s", self.upstash_url)
        else:
            logger.info("RedisService: no Redis credentials configured")

    async def connect(self) -> bool:
        # ── Strategy 1: native Redis protocol (includes Upstash rediss://) ──
        if self.redis_url:
            if await self._connect_redis_url(self.redis_url):
                return True

        # ── Strategy 2: Upstash REST SDK ───────────────────────────────────
        if self.upstash_url and self.upstash_token:
            if await self._connect_upstash_rest():
                return True

        self.is_connected = False
        self.client = None
        self.mode = None
        logger.warning(
            "Redis unavailable — running in cache-bypass mode. "
            "Chat still works; history cache is disabled."
        )
        return False

    async def _connect_redis_url(self, url: str) -> bool:
        try:
            kwargs: dict = {
                "encoding": "utf-8",
                "decode_responses": True,
                "socket_connect_timeout": 5.0,
                "socket_timeout": 5.0,
            }

            # Upstash / managed Redis use TLS via rediss://.
            # redis-py accepts ssl_cert_reqs as a from_url kwarg (not ssl=).
            # Some macOS Python builds lack CA certs → CERT_NONE in development.
            if url.startswith("rediss://"):
                if settings.ENVIRONMENT == "development":
                    kwargs["ssl_cert_reqs"] = ssl.CERT_NONE
                    kwargs["ssl_check_hostname"] = False
                else:
                    try:
                        import certifi

                        kwargs["ssl_ca_certs"] = certifi.where()
                        kwargs["ssl_cert_reqs"] = ssl.CERT_REQUIRED
                    except Exception:
                        kwargs["ssl_cert_reqs"] = ssl.CERT_REQUIRED

            self.client = aioredis.from_url(url, **kwargs)
            await self.client.ping()
            self.is_connected = True
            self.mode = "redis"
            logger.info("Successfully connected to Redis via REDIS_URL.")
            return True
        except Exception as e:
            logger.warning("REDIS_URL connection failed: %s", e)
            self.client = None
            return False

    async def _connect_upstash_rest(self) -> bool:
        try:
            from upstash_redis.asyncio import Redis as UpstashRedis
        except ImportError:
            logger.warning(
                "UPSTASH_REDIS_REST_* is set but package 'upstash-redis' is not installed. "
                "Install with: pip install upstash-redis   "
                "(or rely on REDIS_URL instead)."
            )
            return False

        try:
            self.client = UpstashRedis(
                url=self.upstash_url, token=self.upstash_token
            )
            await self.client.ping()
            self.is_connected = True
            self.mode = "upstash_rest"
            logger.info("Successfully connected to Upstash Redis REST.")
            return True
        except Exception as e:
            logger.warning("Upstash REST connection failed: %s", e)
            self.client = None
            return False

    async def get(self, key: str) -> dict | list | str | None:
        if not self.is_connected or not self.client:
            return None
        try:
            val = await self.client.get(key)
            if not val:
                return None
            try:
                if isinstance(val, (dict, list)):
                    return val
                return json.loads(val)
            except (json.JSONDecodeError, TypeError):
                return val
        except Exception as e:
            logger.warning("Redis GET failed for key '%s': %s", key, e)
            return None

    async def set(self, key: str, value: dict | list | str, ttl: int | None = None) -> bool:
        if not self.is_connected or not self.client:
            return False
        try:
            str_val = json.dumps(value) if not isinstance(value, str) else value
            expire_ttl = ttl or settings.REDIS_TTL_SECONDS
            if self.mode == "upstash_rest":
                # upstash-redis uses ex= for TTL
                await self.client.set(key, str_val, ex=expire_ttl)
            else:
                await self.client.set(key, str_val, ex=expire_ttl)
            return True
        except Exception as e:
            logger.warning("Redis SET failed for key '%s': %s", key, e)
            return False

    async def delete(self, key: str) -> bool:
        if not self.is_connected or not self.client:
            return False
        try:
            await self.client.delete(key)
            return True
        except Exception as e:
            logger.warning("Redis DELETE failed for key '%s': %s", key, e)
            return False

    async def close(self) -> None:
        if not self.client:
            return
        try:
            if self.mode == "redis":
                close = getattr(self.client, "aclose", None) or getattr(
                    self.client, "close", None
                )
                if close:
                    result = close()
                    if hasattr(result, "__await__"):
                        await result
            logger.info("Redis connection closed.")
        except Exception as e:
            logger.warning("Error closing Redis connection: %s", e)
        finally:
            self.client = None
            self.is_connected = False
            self.mode = None


redis_service = RedisService()
