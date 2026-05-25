from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base

from app.config import settings

db_url = settings.DB_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Strip query parameters for asyncpg to prevent 'sslmode' error
if "postgresql+asyncpg://" in db_url and "?" in db_url:
    db_url = db_url.split("?", 1)[0]

engine = create_async_engine(
    db_url, echo=False, pool_size=5, max_overflow=10, pool_pre_ping=True
)

async_session = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()


async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
