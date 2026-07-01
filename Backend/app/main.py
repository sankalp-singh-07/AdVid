from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError

from app.db import Base, engine
from app.schema_sync import ensure_missing_columns
from routes import (
    auth_route,
    payment_route,
    document_route,
    chat_route,
)
from app.error_handlers import (
    http_exception_handler,
    integrity_error_handler,
    operational_error_handler,
    sqlalchemy_error_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)

import sentry_sdk
from app.config import settings
from utils.logger import get_logger

# ─── Import all models so SQLAlchemy can see them ────────────────────────────
import models.user_model      # noqa: F401
import models.payment_model   # noqa: F401
import models.document_model  # noqa: F401
import models.chunk_model     # noqa: F401
import models.chat_model      # noqa: F401

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — environment: %s", settings.ENVIRONMENT)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(ensure_missing_columns)
    logger.info("Database tables verified/created.")

    # Initialise vector database collection
    try:
        from services.vectorstore_service import vectorstore_service
        await vectorstore_service.ensure_collection()
    except Exception as e:
        logger.error("Failed to initialise Qdrant on startup: %s", e)

    # Initialise Redis cache connection
    try:
        from services.redis_service import redis_service
        await redis_service.connect()
    except Exception as e:
        logger.error("Failed to connect to Redis on startup: %s", e)

    yield
    
    # Shutdown hooks
    try:
        from services.redis_service import redis_service
        await redis_service.close()
    except Exception as e:
        logger.error("Error closing Redis on shutdown: %s", e)
    logger.info("Shutting down.")


if settings.SENTRY_DSN and settings.SENTRY_DSN.startswith("http"):
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        send_default_pii=True,
    )

app = FastAPI(
    lifespan=lifespan,
    title="Enterprise AI Knowledge Platform",
    description=(
        "RAG-powered document intelligence platform. "
        "Upload documents, search semantically, chat with your knowledge base."
    ),
    version="2.0.0",
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Error Handlers ───────────────────────────────────────────────────────────
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(OperationalError, operational_error_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# ─── Routes ───────────────────────────────────────────────────────────────────
app.include_router(auth_route.router, prefix="/api")
app.include_router(document_route.router, prefix="/api")
app.include_router(chat_route.router, prefix="/api")
app.include_router(payment_route.router, prefix="/api")


@app.get("/", tags=["health"])
async def root():
    return {
        "message": "Enterprise AI Knowledge Platform is running.",
        "version": "2.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health():
    """Health check endpoint for load balancers / uptime monitors."""
    return {"status": "ok"}


@app.get("/sentry-debug", include_in_schema=False)
async def trigger_error():
    """Sentry connectivity test — do not call in production."""
    1 / 0
