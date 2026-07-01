import json
import redis.asyncio as aioredis
from app.config import settings
from utils.logger import get_logger

logger = get_logger("redis_service")


class RedisService:
    """
    Manages caching operations using Redis.
    Provides fallback to bypass cache if Redis connection is offline/failed.
    Supports Upstash serverless Redis via REST API.
    """

    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self.upstash_url = settings.UPSTASH_REDIS_REST_URL
        self.upstash_token = settings.UPSTASH_REDIS_REST_TOKEN
        self.client = None
        self.is_connected = False

        if self.upstash_url and self.upstash_token:
            logger.info("RedisService initialising with Upstash REST: %s", self.upstash_url)
        else:
            logger.info("RedisService initialising with url: %s", self.redis_url)

    async def connect(self) -> bool:
        """
        Attempts connection to Redis. Returns True if successful.
        """
        try:
            if self.upstash_url and self.upstash_token:
                from upstash_redis.asyncio import Redis as UpstashRedis
                self.client = UpstashRedis(
                    url=self.upstash_url, token=self.upstash_token
                )
                await self.client.ping()
                self.is_connected = True
                logger.info("Successfully connected to Upstash Redis.")
                return True
            else:
                self.client = aioredis.from_url(
                    self.redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=2.0,
                )
                await self.client.ping()
                self.is_connected = True
                logger.info("Successfully connected to standard Redis.")
                return True
        except Exception as e:
            self.is_connected = False
            self.client = None
            logger.warning(
                "Redis connection failed. Running in cache-bypass mode. Error: %s",
                e,
            )
            return False

    async def get(self, key: str) -> dict | list | str | None:
        """
        Retrieves a cached value from Redis. Returns None on cache miss or connection failure.
        """
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

    async def set(self, key: str, value: dict | list | str, ttl: int = None) -> bool:
        """
        Saves a value in Redis with an optional TTL (expires time in seconds).
        """
        if not self.is_connected or not self.client:
            return False

        try:
            str_val = json.dumps(value) if not isinstance(value, str) else value
            expire_ttl = ttl or settings.REDIS_TTL_SECONDS
            await self.client.set(key, str_val, ex=expire_ttl)
            return True
        except Exception as e:
            logger.warning("Redis SET failed for key '%s': %s", key, e)
            return False

    async def delete(self, key: str) -> bool:
        """
        Deletes a key from Redis.
        """
        if not self.is_connected or not self.client:
            return False

        try:
            await self.client.delete(key)
            return True
        except Exception as e:
            logger.warning("Redis DELETE failed for key '%s': %s", key, e)
            return False

    async def close(self):
        """Closes Redis connection pool."""
        if self.client:
            try:
                # Upstash REST client doesn't need explicit close
                if not (self.upstash_url and self.upstash_token):
                    await self.client.close()
                logger.info("Redis connection closed.")
            except Exception as e:
                logger.warning("Error closing Redis connection: %s", e)


redis_service = RedisService()

