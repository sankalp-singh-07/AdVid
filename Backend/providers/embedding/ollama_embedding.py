import httpx
from langchain_ollama import OllamaEmbeddings

from app.config import settings
from providers.embedding.base import EmbeddingProvider
from utils.logger import get_logger

logger = get_logger("ollama_embedding")


class OllamaEmbeddingProvider(EmbeddingProvider):
    name = "ollama"

    def __init__(self) -> None:
        self._model_name = settings.EMBEDDING_MODEL
        self._base_url = settings.EMBEDDING_BASE_URL
        self._dimension = settings.QDRANT_VECTOR_SIZE
        self.embeddings = OllamaEmbeddings(
            base_url=self._base_url,
            model=self._model_name,
        )
        logger.info(
            "OllamaEmbeddingProvider model=%s dim=%d",
            self._model_name,
            self._dimension,
        )

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def dimension(self) -> int:
        return self._dimension

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        batch_size = max(1, settings.EMBEDDING_BATCH_SIZE)
        all_vectors: list[list[float]] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            vectors = await self.embeddings.aembed_documents(batch)
            all_vectors.extend(vectors)
            logger.debug(
                "Embedded batch %d–%d / %d",
                i + 1,
                min(i + batch_size, len(texts)),
                len(texts),
            )
        return all_vectors

    async def embed_query(self, text: str) -> list[float]:
        return await self.embeddings.aembed_query(text)

    async def check_health(self) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self._base_url.rstrip('/')}/api/tags"
                response = await client.get(url, timeout=5.0)
                return response.status_code == 200
        except Exception as e:
            logger.error("Embedding health check failed: %s", e)
            return False
