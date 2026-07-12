from collections.abc import AsyncIterator

import httpx

from app.config import settings
from providers.llm.base import LLMProvider
from utils.logger import get_logger

logger = get_logger("openai_llm")


class OpenAICompatibleLLMProvider(LLMProvider):
    """
    OpenAI Chat Completions API — works with OpenAI, vLLM, LiteLLM, etc.
    Requires langchain-openai when used (optional dependency).
    """

    name = "openai_compatible"

    def __init__(self) -> None:
        self._model_name = settings.LLM_MODEL
        self._base_url = settings.OPENAI_BASE_URL or settings.LLM_BASE_URL
        self._api_key = settings.OPENAI_API_KEY or "not-needed"

        try:
            from langchain_openai import ChatOpenAI
        except ImportError as e:
            raise RuntimeError(
                "langchain-openai is required for openai_compatible provider. "
                "Install with: pip install langchain-openai"
            ) from e

        self.llm = ChatOpenAI(
            model=self._model_name,
            api_key=self._api_key,
            base_url=self._base_url,
            temperature=settings.LLM_TEMPERATURE,
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
        logger.info(
            "OpenAICompatibleLLMProvider model=%s base_url=%s",
            self._model_name,
            self._base_url,
        )

    @property
    def model_name(self) -> str:
        return self._model_name

    def get_langchain_model(self):
        return self.llm

    async def ainvoke(self, messages: list) -> str:
        response = await self.llm.ainvoke(messages)
        return response.content if hasattr(response, "content") else str(response)

    async def astream(self, messages: list) -> AsyncIterator[str]:
        async for chunk in self.llm.astream(messages):
            text = chunk.content if hasattr(chunk, "content") else str(chunk)
            if text:
                yield text

    async def check_health(self) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                headers = {}
                if self._api_key and self._api_key != "not-needed":
                    headers["Authorization"] = f"Bearer {self._api_key}"
                url = f"{self._base_url.rstrip('/')}/models"
                response = await client.get(url, headers=headers, timeout=5.0)
                return response.status_code < 500
        except Exception as e:
            logger.error("OpenAI-compatible health check failed: %s", e)
            return False
