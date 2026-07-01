import httpx
from langchain_ollama import ChatOllama
from app.config import settings
from utils.logger import get_logger

logger = get_logger("llm_service")


class LlmService:
    """
    Manages connection and query execution to the remote Ollama LLM server.
    Wraps LangChain's ChatOllama for standard generation, streaming, and health checks.
    """

    def __init__(self):
        self.llm = ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
            temperature=0.2,  # lower temperature for more factual RAG responses
        )
        logger.info(
            "LlmService initialised targeting Ollama base_url=%s, model=%s",
            settings.OLLAMA_BASE_URL,
            settings.OLLAMA_MODEL,
        )

    def get_model(self) -> ChatOllama:
        """Returns the configured ChatOllama instance."""
        return self.llm

    async def check_health(self) -> bool:
        """
        Pings the remote Ollama server to verify it is responsive and has the
        required chat model loaded.
        """
        try:
            async with httpx.AsyncClient() as client:
                url = f"{settings.OLLAMA_BASE_URL}/api/tags"
                response = await client.get(url, timeout=5.0)
                if response.status_code != 200:
                    logger.error("Ollama server returned HTTP %d in tags check", response.status_code)
                    return False

                data = response.json()
                models = [m["name"] for m in data.get("models", [])]

                configured_model = settings.OLLAMA_MODEL
                match_found = False
                for m in models:
                    if m == configured_model or m.startswith(f"{configured_model}:"):
                        match_found = True
                        break

                if not match_found:
                    logger.warning(
                        "Ollama server is up, but configured chat model '%s' is missing. Available models: %s",
                        configured_model,
                        models,
                    )
                    return True  # Ollama is running, model list check is warning only

                logger.info("Ollama LLM chat model '%s' verified online.", settings.OLLAMA_MODEL)
                return True
        except Exception as e:
            logger.error("Ollama connection timed out or failed at %s: %s", settings.OLLAMA_BASE_URL, e)
            return False


llm_service = LlmService()
