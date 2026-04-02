from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import Base, engine
from routes import auth_route


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    lifespan=lifespan,
    title="AIVID",
)

app.include_router(auth_route.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "AiVid backend is running."}
