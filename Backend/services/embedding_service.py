import httpx
from langchain_ollama import OllamaEmbeddings
from app.config import settings
from utils.logger import get_logger

logger = get_logger("embedding_service")


class EmbeddingService:
    """
    Manages embedding generation using a remote Ollama instance.
    Uses the model specified in settings.OLLAMA_EMBED_MODEL (e.g., nomic-embed-text).
    """

    def __init__(self):
        self.embeddings = OllamaEmbeddings(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_EMBED_MODEL,
        )
        logger.info(
            "EmbeddingService initialised with base_url=%s, model=%s",
            settings.OLLAMA_BASE_URL,
            settings.OLLAMA_EMBED_MODEL,
        )

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        """
        Generates vector embeddings for a list of texts.
        """
        try:
            logger.info("Generating embeddings for %d text chunks...", len(texts))
            vectors = await self.embeddings.aembed_documents(texts)
            logger.info("Successfully generated %d embeddings.", len(vectors))
            return vectors
        except Exception as e:
            logger.error("Embedding generation failed: %s", e, exc_info=True)
            raise RuntimeError(f"Ollama embedding model failed: {str(e)}")

    async def get_query_embedding(self, text: str) -> list[float]:
        """
        Generates vector embedding for a single search query.
        """
        try:
            return await self.embeddings.aembed_query(text)
        except Exception as e:
            logger.error("Embedding query generation failed: %s", e, exc_info=True)
            raise RuntimeError(f"Ollama embedding model failed: {str(e)}")

    async def check_health(self) -> bool:
        """
        Checks if the remote Ollama server is reachable and if the required
        embedding model is installed.
        """
        try:
            async with httpx.AsyncClient() as client:
                # Ollama health endpoint
                url = f"{settings.OLLAMA_BASE_URL}/api/tags"
                response = await client.get(url, timeout=5.0)
                if response.status_code != 200:
                    logger.error("Ollama server returned status_code=%d", response.status_code)
                    return False

                data = response.json()
                models = [m["name"] for m in data.get("models", [])]
                
                # Check if configured model name matches (Ollama sometimes appends tag like :latest)
                configured_model = settings.OLLAMA_EMBED_MODEL
                match_found = False
                for m in models:
                    if m == configured_model or m.startswith(f"{configured_model}:"):
                        match_found = True
                        break

                if not match_found:
                    logger.warning(
                        "Ollama is online, but required embedding model '%s' is not found. Available models: %s",
                        configured_model,
                        models,
                    )
                    # We still return True if Ollama is up, but warn
                    return True

                logger.info("Ollama embedding service is online and healthy.")
                return True
        except Exception as e:
            logger.error("Ollama server is unreachable at %s: %s", settings.OLLAMA_BASE_URL, e)
            return False


embedding_service = EmbeddingService()
