from collections.abc import AsyncIterator

import httpx
from langchain_ollama import ChatOllama

from app.config import settings
from providers.llm.base import LLMProvider
from utils.logger import get_logger

logger = get_logger("ollama_llm")


class OllamaLLMProvider(LLMProvider):
    name = "ollama"

    def __init__(self) -> None:
        self._model_name = settings.LLM_MODEL
        self._base_url = settings.LLM_BASE_URL
        self.llm = ChatOllama(
            base_url=self._base_url,
            model=self._model_name,
            temperature=settings.LLM_TEMPERATURE,
        )
        logger.info(
            "OllamaLLMProvider model=%s base_url=%s",
            self._model_name,
            self._base_url,
        )

    @property
    def model_name(self) -> str:
        return self._model_name

    def get_langchain_model(self) -> ChatOllama:
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
                url = f"{self._base_url.rstrip('/')}/api/tags"
                response = await client.get(url, timeout=5.0)
                if response.status_code != 200:
                    return False
                models = [m["name"] for m in response.json().get("models", [])]
                match = any(
                    m == self._model_name or m.startswith(f"{self._model_name}:")
                    for m in models
                )
                if not match:
                    logger.warning(
                        "Ollama up but model '%s' missing. Available: %s",
                        self._model_name,
                        models,
                    )
                return True
        except Exception as e:
            logger.error("Ollama health check failed: %s", e)
            return False
