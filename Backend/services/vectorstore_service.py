import uuid
from urllib.parse import urlparse

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels

from app.config import settings
from utils.logger import get_logger

logger = get_logger("vectorstore_service")


def _normalize_qdrant_url(raw: str) -> str:
    """
    Normalize Qdrant Cloud / self-hosted URLs.

    Cloud clusters expect https://<id>.<region>.aws.cloud.qdrant.io
    (optionally with :6333). Strip trailing slashes and accidental /api paths.
    """
    url = (raw or "").strip().rstrip("/")
    if not url:
        return "http://localhost:6333"

    # Common mistake: paste dashboard URL or path-suffixed endpoint
    for suffix in ("/dashboard", "/collections", "/api", "/api/v1"):
        if url.endswith(suffix):
            url = url[: -len(suffix)]

    parsed = urlparse(url)
    if not parsed.scheme:
        url = f"https://{url}"
        parsed = urlparse(url)

    # Self-hosted default port when scheme is http and no port given
    if parsed.scheme == "http" and parsed.port is None and parsed.hostname in (
        "localhost",
        "127.0.0.1",
    ):
        url = f"http://{parsed.hostname}:6333"

    return url.rstrip("/")


class VectorStoreService:
    """
    Async Qdrant client wrapper.
    Supports multi-tenant (user_id) and multi-document knowledge base filters.
    """

    def __init__(self) -> None:
        self.endpoint = _normalize_qdrant_url(settings.QDRANT_URL)
        self.collection_name = settings.QDRANT_COLLECTION
        self._ready = False
        self._last_error: str | None = None

        client_kwargs: dict = {
            "url": self.endpoint,
            "api_key": settings.QDRANT_API_KEY or None,
            "timeout": 30,
            "check_compatibility": False,
            "prefer_grpc": False,
        }
        # Local / non-TLS deployments sometimes need this
        if self.endpoint.startswith("http://"):
            client_kwargs["https"] = False

        self.client = AsyncQdrantClient(**client_kwargs)
        logger.info("VectorStoreService endpoint=%s", self.endpoint)

    async def ensure_collection(self) -> None:
        try:
            collections_response = await self.client.get_collections()
            collections = [col.name for col in collections_response.collections]

            if self.collection_name not in collections:
                logger.info(
                    "Creating Qdrant collection '%s' size=%d",
                    self.collection_name,
                    settings.QDRANT_VECTOR_SIZE,
                )
                await self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=qmodels.VectorParams(
                        size=settings.QDRANT_VECTOR_SIZE,
                        distance=qmodels.Distance.COSINE,
                    ),
                )
                for field in ("user_id", "document_id", "knowledge_base_id", "filename"):
                    await self.client.create_payload_index(
                        collection_name=self.collection_name,
                        field_name=field,
                        field_schema=qmodels.PayloadSchemaType.KEYWORD,
                    )
                logger.info("Qdrant collection and indexes created.")
            else:
                try:
                    await self.client.create_payload_index(
                        collection_name=self.collection_name,
                        field_name="knowledge_base_id",
                        field_schema=qmodels.PayloadSchemaType.KEYWORD,
                    )
                except Exception:
                    pass
                logger.info("Qdrant collection '%s' ready.", self.collection_name)

            self._ready = True
            self._last_error = None
        except Exception as e:
            self._ready = False
            self._last_error = str(e)
            hint = self._diagnostic_hint(e)
            logger.error(
                "Failed to ensure Qdrant collection at %s: %s\n%s",
                self.endpoint,
                e,
                hint,
            )
            raise RuntimeError(
                f"Could not connect to Qdrant at {self.endpoint}: {e}. {hint}"
            ) from e

    def _diagnostic_hint(self, error: Exception) -> str:
        msg = str(error).lower()
        if "404" in msg:
            return (
                "HINT: Qdrant returned 404 for every API path — the Cloud cluster is "
                "almost certainly deleted, paused, or the URL is wrong. "
                "Fix: open https://cloud.qdrant.io → recreate a free cluster → "
                "copy the new Cluster URL + API key into QDRANT_URL / QDRANT_API_KEY. "
                "Or run local Qdrant: docker run -p 6333:6333 qdrant/qdrant "
                "and set QDRANT_URL=http://localhost:6333 (no API key)."
            )
        if "401" in msg or "403" in msg or "unauthorized" in msg:
            return "HINT: Check QDRANT_API_KEY matches the cluster in Qdrant Cloud."
        if "timeout" in msg or "connect" in msg:
            return "HINT: Network/firewall issue or cluster not reachable."
        return "HINT: Verify QDRANT_URL and QDRANT_API_KEY in Backend/.env"

    async def insert_chunks(
        self, chunks: list[dict], vectors: list[list[float]], doc_meta: dict
    ) -> list[str]:
        await self.ensure_collection()
        points = []
        point_ids: list[str] = []

        for idx, chunk in enumerate(chunks):
            point_id = str(uuid.uuid4())
            point_ids.append(point_id)
            payload = {
                "document_id": doc_meta["document_id"],
                "user_id": doc_meta["user_id"],
                "knowledge_base_id": doc_meta.get("knowledge_base_id"),
                "filename": doc_meta["filename"],
                "department": doc_meta.get("department"),
                "owner": doc_meta.get("owner"),
                "page": chunk["page_number"],
                "chunk_index": chunk["chunk_index"],
                "content": chunk["content"],
                "created_at": doc_meta["created_at"].isoformat()
                if hasattr(doc_meta["created_at"], "isoformat")
                else str(doc_meta["created_at"]),
            }
            points.append(
                qmodels.PointStruct(id=point_id, vector=vectors[idx], payload=payload)
            )

        batch_size = 64
        try:
            for i in range(0, len(points), batch_size):
                batch = points[i : i + batch_size]
                await self.client.upsert(
                    collection_name=self.collection_name, points=batch
                )
            logger.info("Upserted %d vectors into Qdrant.", len(points))
            return point_ids
        except Exception as e:
            logger.error("Qdrant insert failed: %s", e, exc_info=True)
            raise RuntimeError(f"Qdrant insertion failure: {e}") from e

    async def delete_chunks_by_document(self, document_id: str, user_id: str) -> None:
        try:
            await self.client.delete(
                collection_name=self.collection_name,
                points_selector=qmodels.FilterSelector(
                    filter=qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="document_id",
                                match=qmodels.MatchValue(value=document_id),
                            ),
                            qmodels.FieldCondition(
                                key="user_id",
                                match=qmodels.MatchValue(value=user_id),
                            ),
                        ]
                    )
                ),
            )
            logger.info("Deleted Qdrant vectors for document_id=%s", document_id)
        except Exception as e:
            logger.error("Qdrant delete failed: %s", e, exc_info=True)
            raise RuntimeError(f"Qdrant deletion failure: {e}") from e

    async def delete_chunks_by_knowledge_base(
        self, knowledge_base_id: str, user_id: str
    ) -> None:
        try:
            await self.client.delete(
                collection_name=self.collection_name,
                points_selector=qmodels.FilterSelector(
                    filter=qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="knowledge_base_id",
                                match=qmodels.MatchValue(value=knowledge_base_id),
                            ),
                            qmodels.FieldCondition(
                                key="user_id",
                                match=qmodels.MatchValue(value=user_id),
                            ),
                        ]
                    )
                ),
            )
        except Exception as e:
            logger.error("Qdrant KB delete failed: %s", e, exc_info=True)
            raise RuntimeError(f"Qdrant KB deletion failure: {e}") from e

    async def similarity_search(
        self,
        query_vector: list[float],
        user_id: str,
        limit: int = 5,
        document_id: str | None = None,
        knowledge_base_id: str | None = None,
        score_threshold: float | None = None,
    ) -> list[dict]:
        must_conditions = [
            qmodels.FieldCondition(
                key="user_id", match=qmodels.MatchValue(value=user_id)
            )
        ]
        if knowledge_base_id:
            must_conditions.append(
                qmodels.FieldCondition(
                    key="knowledge_base_id",
                    match=qmodels.MatchValue(value=knowledge_base_id),
                )
            )
        if document_id:
            must_conditions.append(
                qmodels.FieldCondition(
                    key="document_id",
                    match=qmodels.MatchValue(value=document_id),
                )
            )

        query_filter = qmodels.Filter(must=must_conditions)

        try:
            results = await self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                query_filter=query_filter,
                limit=limit,
                score_threshold=score_threshold,
            )
            hits = []
            for hit in results.points:
                hits.append(
                    {"id": hit.id, "score": hit.score, "payload": hit.payload or {}}
                )
            return hits
        except Exception as e:
            logger.error("Qdrant search failed: %s", e, exc_info=True)
            raise RuntimeError(f"Vector search failure: {e}") from e


vectorstore_service = VectorStoreService()
