from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError

from app.db import Base, engine
from app.schema_sync import ensure_missing_columns
from routes import auth_route, payment_route, project_route
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

import models.user_model  # noqa: F401
import models.project_model  # noqa: F401
import models.payment_model  # noqa: F401

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — environment: %s", settings.ENVIRONMENT)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(ensure_missing_columns)
    logger.info("Database tables verified/created.")
    yield
    logger.info("Shutting down.")


sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    send_default_pii=True,
)


app = FastAPI(
    lifespan=lifespan,
    title="AIVID",
)

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

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(OperationalError, operational_error_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(auth_route.router, prefix="/api")
app.include_router(project_route.router, prefix="/api")
app.include_router(payment_route.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "AiVid backend is running."}


@app.get("/sentry-debug")
async def trigger_error():
    division_by_zero = 1 / 0
