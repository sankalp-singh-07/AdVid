from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    """Abstract embedding interface for document/query vectors."""

    name: str = "base"

    @abstractmethod
    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of document chunks."""

    @abstractmethod
    async def embed_query(self, text: str) -> list[float]:
        """Embed a single search query."""

    @abstractmethod
    async def check_health(self) -> bool:
        """Return True if the embedding endpoint is healthy."""

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Configured embedding model identifier."""

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Vector dimensionality."""
