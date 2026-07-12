"""
Embedding service facade over EmbeddingProvider.

Default: Ollama + nomic-embed-text (768-d). Batching and health checks included.
"""

from providers.embedding import get_embedding_provider
from utils.logger import get_logger

logger = get_logger("embedding_service")


class EmbeddingService:
    def __init__(self) -> None:
        self._provider = get_embedding_provider()
        logger.info(
            "EmbeddingService provider=%s model=%s dim=%d",
            self._provider.name,
            self._provider.model_name,
            self._provider.dimension,
        )

    @property
    def model_name(self) -> str:
        return self._provider.model_name

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        try:
            logger.info("Generating embeddings for %d text chunks...", len(texts))
            vectors = await self._provider.embed_documents(texts)
            logger.info("Successfully generated %d embeddings.", len(vectors))
            return vectors
        except Exception as e:
            logger.error("Embedding generation failed: %s", e, exc_info=True)
            raise RuntimeError(f"Embedding model failed: {e}") from e

    async def get_query_embedding(self, text: str) -> list[float]:
        try:
            return await self._provider.embed_query(text)
        except Exception as e:
            logger.error("Embedding query generation failed: %s", e, exc_info=True)
            raise RuntimeError(f"Embedding model failed: {e}") from e

    async def check_health(self) -> bool:
        return await self._provider.check_health()


embedding_service = EmbeddingService()
