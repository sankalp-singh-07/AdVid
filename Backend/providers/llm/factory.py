from functools import lru_cache

from app.config import settings
from providers.llm.base import LLMProvider
from utils.logger import get_logger

logger = get_logger("llm_factory")


@lru_cache(maxsize=1)
def get_llm_provider() -> LLMProvider:
    provider = (settings.LLM_PROVIDER or "ollama").lower().strip()

    if provider == "ollama":
        from providers.llm.ollama_provider import OllamaLLMProvider

        logger.info("Using OllamaLLMProvider")
        return OllamaLLMProvider()

    if provider in ("openai", "openai_compatible", "vllm"):
        from providers.llm.openai_provider import OpenAICompatibleLLMProvider

        logger.info("Using OpenAICompatibleLLMProvider")
        return OpenAICompatibleLLMProvider()

    raise RuntimeError(
        f"Unknown LLM_PROVIDER '{provider}'. Supported: ollama, openai_compatible, vllm"
    )
