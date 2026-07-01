from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    # ─── Core ────────────────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    SENTRY_DSN: str = "sentry-dsn"

    # ─── Database ─────────────────────────────────────────────────────────────
    DB_URL: str = "postgresql+asyncpg://dummyData/dummyDb"

    # ─── JWT ──────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "JWT_SECRET_KEY_DUMMY_ONE"
    JWT_REFRESH_SECRET_KEY: str = "JWT_REFRESH_SECRET_KEY_DUMMY_ONE"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440       # 24 hours
    JWT_REFRESH_EXPIRE_MINUTES: int = 10080  # 7 days

    # ─── Ollama (Remote LLM Server — never hardcode localhost) ────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"   # override in production
    OLLAMA_MODEL: str = "llama3"                      # chat / generation model
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"      # embedding model (dim=768)

    # ─── Qdrant Vector Database ───────────────────────────────────────────────
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str | None = None
    QDRANT_COLLECTION: str = "knowledge_base"
    QDRANT_VECTOR_SIZE: int = 768   # must match OLLAMA_EMBED_MODEL output dim

    # ─── Redis Cache ──────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_TTL_SECONDS: int = 3600   # default cache TTL = 1 hour

    # ─── Local File Storage ───────────────────────────────────────────────────
    # All uploaded documents are stored here. Mount a persistent volume in prod.
    STORAGE_PATH: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # ─── Razorpay (Subscription / Billing) ────────────────────────────────────
    RAZORPAY_KEY_ID: str | None = None
    RAZORPAY_KEY_SECRET: str | None = None
    RAZORPAY_TEST_MODE: bool = True

    # ─── RAG Pipeline Tuning ──────────────────────────────────────────────────
    RAG_CHUNK_SIZE: int = 512          # tokens per chunk
    RAG_CHUNK_OVERLAP: int = 50        # overlap between consecutive chunks
    RAG_TOP_K: int = 5                 # number of chunks to retrieve per query

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
