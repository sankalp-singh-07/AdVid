"""
LLM service facade over LLMProvider.

Switch models/providers via LLM_PROVIDER / LLM_MODEL env config only.
"""

from collections.abc import AsyncIterator

from providers.llm import get_llm_provider
from utils.logger import get_logger

logger = get_logger("llm_service")


class LlmService:
    def __init__(self) -> None:
        self._provider = get_llm_provider()
        logger.info(
            "LlmService provider=%s model=%s",
            self._provider.name,
            self._provider.model_name,
        )

    def get_model(self):
        """LangChain-compatible chat model (backward compatible)."""
        return self._provider.get_langchain_model()

    @property
    def model_name(self) -> str:
        return self._provider.model_name

    @property
    def provider_name(self) -> str:
        return self._provider.name

    async def ainvoke(self, messages: list) -> str:
        return await self._provider.ainvoke(messages)

    async def astream(self, messages: list) -> AsyncIterator[str]:
        async for token in self._provider.astream(messages):
            yield token

    async def check_health(self) -> bool:
        return await self._provider.check_health()


llm_service = LlmService()
