from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Any


class LLMProvider(ABC):
    """
    Abstract chat LLM interface.

    Supports Ollama, OpenAI-compatible APIs (vLLM, hosted OpenAI), and future custom models.
    """

    name: str = "base"

    @abstractmethod
    def get_langchain_model(self) -> Any:
        """Return a LangChain-compatible chat model instance."""

    @abstractmethod
    async def ainvoke(self, messages: list) -> str:
        """Generate a full completion and return text content."""

    @abstractmethod
    async def astream(self, messages: list) -> AsyncIterator[str]:
        """Stream completion tokens as they arrive."""

    @abstractmethod
    async def check_health(self) -> bool:
        """Return True if the provider endpoint is reachable."""

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Configured model identifier."""
