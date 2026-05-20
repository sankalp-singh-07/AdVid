from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import Base, engine
from routes import auth_route, project_route

import sentry_sdk
from app.config import settings

import models.user_model  # noqa: F401
import models.project_model  # noqa: F401

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    send_default_pii=True,
)


app = FastAPI(
    lifespan=lifespan,
    title="AIVID",
)

app.include_router(auth_route.router, prefix="/api")
app.include_router(project_route.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "AiVid backend is running."}


@app.get("/sentry-debug")
async def trigger_error():
    division_by_zero = 1 / 0