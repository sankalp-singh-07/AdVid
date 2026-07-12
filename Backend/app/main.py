from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError

from app.config import settings
from app.db import Base, engine
from app.error_handlers import (
    http_exception_handler,
    integrity_error_handler,
    operational_error_handler,
    sqlalchemy_error_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from routes import (
    auth_route,
    chat_route,
    document_route,
    knowledge_base_route,
    payment_route,
)
from utils.logger import get_logger

import models.user_model  # noqa: F401
import models.payment_model  # noqa: F401
import models.knowledge_base_model  # noqa: F401
import models.document_model  # noqa: F401
import models.chunk_model  # noqa: F401
import models.chat_model  # noqa: F401

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — environment: %s", settings.ENVIRONMENT)
    logger.info(
        "Providers — LLM: %s (%s) | Embed: %s (%s) | Storage: %s",
        settings.LLM_PROVIDER,
        settings.LLM_MODEL,
        settings.EMBEDDING_PROVIDER,
        settings.EMBEDDING_MODEL,
        settings.STORAGE_PROVIDER,
    )

    try:
        from services.vectorstore_service import vectorstore_service

        await vectorstore_service.ensure_collection()
        logger.info("Qdrant collection ready.")
    except Exception as e:
        # App still boots so /health and non-RAG routes work; RAG will fail until fixed.
        logger.error(
            "Qdrant unavailable at startup (RAG/upload ingest will fail until fixed):\n%s",
            e,
        )

    try:
        from services.redis_service import redis_service

        ok = await redis_service.connect()
        if ok:
            logger.info("Redis connected (mode=%s).", redis_service.mode)
        else:
            logger.warning("Redis offline — continuing without cache.")
    except Exception as e:
        logger.error("Failed to connect to Redis on startup: %s", e)

    yield

    try:
        from services.redis_service import redis_service

        await redis_service.close()
    except Exception as e:
        logger.error("Error closing Redis on shutdown: %s", e)
    logger.info("Shutting down.")


if settings.SENTRY_DSN and settings.SENTRY_DSN.startswith("http"):
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        send_default_pii=settings.ENVIRONMENT != "production",
    )

app = FastAPI(
    lifespan=lifespan,
    title="Enterprise AI Knowledge Platform",
    description=(
        "Production RAG document intelligence platform. "
        "Multi-document knowledge bases, streaming chat, citations, export."
    ),
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(OperationalError, operational_error_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(auth_route.router, prefix="/api")
app.include_router(document_route.router, prefix="/api")
app.include_router(chat_route.router, prefix="/api")
app.include_router(knowledge_base_route.router, prefix="/api")
app.include_router(payment_route.router, prefix="/api")


@app.get("/", tags=["health"])
async def root():
    return {
        "message": "Enterprise AI Knowledge Platform is running.",
        "version": "2.1.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health():
    """Deep health check for load balancers / uptime monitors."""
    checks: dict = {"api": "ok"}

    # Database
    try:
        from sqlalchemy import text
        from app.db import async_session

        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"

    # Redis
    try:
        from services.redis_service import redis_service

        checks["redis"] = "ok" if redis_service.is_connected else "degraded"
    except Exception as e:
        checks["redis"] = f"error: {e}"

    # Qdrant
    try:
        from services.vectorstore_service import vectorstore_service

        await vectorstore_service.client.get_collections()
        checks["qdrant"] = "ok"
    except Exception as e:
        checks["qdrant"] = f"error: {e}"

    # LLM
    try:
        from services.llm_service import llm_service

        checks["llm"] = "ok" if await llm_service.check_health() else "degraded"
        checks["llm_model"] = llm_service.model_name
        checks["llm_provider"] = llm_service.provider_name
    except Exception as e:
        checks["llm"] = f"error: {e}"

    # Embeddings
    try:
        from services.embedding_service import embedding_service

        checks["embeddings"] = (
            "ok" if await embedding_service.check_health() else "degraded"
        )
        checks["embedding_model"] = embedding_service.model_name
    except Exception as e:
        checks["embeddings"] = f"error: {e}"

    checks["storage_provider"] = settings.STORAGE_PROVIDER

    critical_ok = checks.get("database") == "ok" and checks.get("api") == "ok"
    return {
        "status": "ok" if critical_ok else "degraded",
        "checks": checks,
        "version": "2.1.0",
    }


if settings.ENVIRONMENT == "development":

    @app.get("/sentry-debug", include_in_schema=False)
    async def trigger_error():
        raise Exception("Sentry integration test")
