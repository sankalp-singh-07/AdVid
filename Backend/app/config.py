from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    # ─── Core ────────────────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    SENTRY_DSN: str = ""
    FRONTEND_URLS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ]

    # ─── Database ─────────────────────────────────────────────────────────────
    DB_URL: str = "postgresql+asyncpg://dummyData/dummyDb"

    # ─── JWT ──────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "JWT_SECRET_KEY_DUMMY_ONE_CHANGE_IN_PROD"
    JWT_REFRESH_SECRET_KEY: str = "JWT_REFRESH_SECRET_KEY_DUMMY_ONE_CHANGE_IN_PROD"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours
    JWT_REFRESH_EXPIRE_MINUTES: int = 10080  # 7 days

    # ─── LLM Provider (config-driven; never hardcode model names in services) ─
    # Providers: "ollama" | "openai_compatible"
    LLM_PROVIDER: str = "ollama"
    LLM_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "llama3"
    LLM_TEMPERATURE: float = 0.2
    LLM_TIMEOUT_SECONDS: float = 120.0

    # Legacy aliases (still accepted via env for backward compatibility)
    OLLAMA_BASE_URL: str | None = None
    OLLAMA_MODEL: str | None = None

    # OpenAI-compatible (vLLM, remote gateways, hosted APIs)
    OPENAI_API_KEY: str | None = None
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"

    # ─── Embedding Provider ───────────────────────────────────────────────────
    EMBEDDING_PROVIDER: str = "ollama"
    EMBEDDING_BASE_URL: str = "http://localhost:11434"
    EMBEDDING_MODEL: str = "nomic-embed-text"
    EMBEDDING_BATCH_SIZE: int = 32
    OLLAMA_EMBED_MODEL: str | None = None  # legacy alias

    # ─── Qdrant Vector Database ───────────────────────────────────────────────
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str | None = None
    QDRANT_COLLECTION: str = "knowledge_base"
    QDRANT_VECTOR_SIZE: int = 768  # must match embedding model output dim

    # ─── Redis Cache ──────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"
    UPSTASH_REDIS_REST_URL: str | None = None
    UPSTASH_REDIS_REST_TOKEN: str | None = None
    REDIS_TTL_SECONDS: int = 3600

    # ─── Storage Provider ─────────────────────────────────────────────────────
    # Providers: "cloudinary" | "s3" | "local"
    STORAGE_PROVIDER: str = "cloudinary"
    STORAGE_PATH: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str | None = None
    CLOUDINARY_API_KEY: str | None = None
    CLOUDINARY_API_SECRET: str | None = None

    # S3 / MinIO (future-ready)
    S3_BUCKET: str | None = None
    S3_REGION: str = "us-east-1"
    S3_ACCESS_KEY_ID: str | None = None
    S3_SECRET_ACCESS_KEY: str | None = None
    S3_ENDPOINT_URL: str | None = None  # set for MinIO / custom endpoints
    S3_PREFIX: str = "documents"

    # ─── Razorpay ─────────────────────────────────────────────────────────────
    RAZORPAY_KEY_ID: str | None = None
    RAZORPAY_KEY_SECRET: str | None = None
    RAZORPAY_TEST_MODE: bool = True

    # ─── RAG Pipeline Tuning ──────────────────────────────────────────────────
    RAG_CHUNK_SIZE: int = 900  # characters (~200–250 tokens for English)
    RAG_CHUNK_OVERLAP: int = 120
    RAG_TOP_K: int = 8  # over-fetch then filter/dedupe
    RAG_FINAL_K: int = 5  # chunks injected into prompt
    RAG_SCORE_THRESHOLD: float = 0.35  # drop weak cosine matches
    RAG_DEDUP_SIMILARITY: float = 0.92  # near-duplicate content ratio
    RAG_HISTORY_WINDOW: int = 10

    # ─── Rate Limiting ────────────────────────────────────────────────────────
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_CHAT_PER_MINUTE: int = 30
    RATE_LIMIT_UPLOAD_PER_MINUTE: int = 10
    RATE_LIMIT_AUTH_PER_MINUTE: int = 20

    # ─── Security ─────────────────────────────────────────────────────────────
    EXPOSE_RESET_CODES: bool = False  # only True in local dev intentionally
    INGESTION_EMBED_BATCH_SIZE: int = 24

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    def model_post_init(self, __context) -> None:
        """Resolve legacy Ollama env vars into provider-agnostic settings."""
        if self.OLLAMA_BASE_URL:
            if self.LLM_BASE_URL == "http://localhost:11434":
                object.__setattr__(self, "LLM_BASE_URL", self.OLLAMA_BASE_URL)
            if self.EMBEDDING_BASE_URL == "http://localhost:11434":
                object.__setattr__(self, "EMBEDDING_BASE_URL", self.OLLAMA_BASE_URL)
        if self.OLLAMA_MODEL and self.LLM_MODEL == "llama3":
            object.__setattr__(self, "LLM_MODEL", self.OLLAMA_MODEL)
        if self.OLLAMA_EMBED_MODEL and self.EMBEDDING_MODEL == "nomic-embed-text":
            object.__setattr__(self, "EMBEDDING_MODEL", self.OLLAMA_EMBED_MODEL)


settings = Settings()
