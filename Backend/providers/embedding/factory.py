from functools import lru_cache

from app.config import settings
from providers.embedding.base import EmbeddingProvider
from utils.logger import get_logger

logger = get_logger("embedding_factory")


@lru_cache(maxsize=1)
def get_embedding_provider() -> EmbeddingProvider:
    provider = (settings.EMBEDDING_PROVIDER or "ollama").lower().strip()

    if provider == "ollama":
        from providers.embedding.ollama_embedding import OllamaEmbeddingProvider

        logger.info("Using OllamaEmbeddingProvider (%s)", settings.EMBEDDING_MODEL)
        return OllamaEmbeddingProvider()

    raise RuntimeError(
        f"Unknown EMBEDDING_PROVIDER '{provider}'. Supported: ollama"
    )
