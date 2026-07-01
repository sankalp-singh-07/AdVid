import uuid
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels
from app.config import settings
from utils.logger import get_logger

logger = get_logger("vectorstore_service")


class VectorStoreService:
    """
    Asynchronous client wrapper for Qdrant Vector Database.
    Handles collection management, point insertions/deletions, and filtered similarity searches.
    """

    def __init__(self):
        self.client = AsyncQdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY
        )
        self.collection_name = settings.QDRANT_COLLECTION
        logger.info("VectorStoreService initialised. Endpoint: %s", settings.QDRANT_URL)

    async def ensure_collection(self) -> None:
        """
        Ensures the target Qdrant collection exists. Creates it if missing.
        """
        try:
            collections_response = await self.client.get_collections()
            collections = [col.name for col in collections_response.collections]

            if self.collection_name not in collections:
                logger.info("Creating Qdrant collection '%s' with vector size %d...", 
                            self.collection_name, settings.QDRANT_VECTOR_SIZE)
                await self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=qmodels.VectorParams(
                        size=settings.QDRANT_VECTOR_SIZE,
                        distance=qmodels.Distance.COSINE
                    )
                )
                # Create indexes on user_id and document_id to optimize filtering queries
                await self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="user_id",
                    field_schema=qmodels.PayloadSchemaType.KEYWORD
                )
                await self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="document_id",
                    field_schema=qmodels.PayloadSchemaType.KEYWORD
                )
                logger.info("Successfully created Qdrant collection and payload indexes.")
            else:
                logger.debug("Qdrant collection '%s' already exists.", self.collection_name)
        except Exception as e:
            logger.error("Failed to verify/create Qdrant collection: %s", e, exc_info=True)
            raise RuntimeError(f"Could not connect to Qdrant Vector Database: {str(e)}")

    async def insert_chunks(self, chunks: list[dict], vectors: list[list[float]], doc_meta: dict) -> list[str]:
        """
        Inserts document chunks and their embeddings into the Qdrant database.
        Returns the list of generated point UUIDs.
        """
        await self.ensure_collection()
        points = []
        point_ids = []

        for idx, chunk in enumerate(chunks):
            point_id = str(uuid.uuid4())
            point_ids.append(point_id)

            payload = {
                "document_id": doc_meta["document_id"],
                "user_id": doc_meta["user_id"],
                "filename": doc_meta["filename"],
                "department": doc_meta.get("department"),
                "owner": doc_meta.get("owner"),
                "page": chunk["page_number"],
                "chunk_index": chunk["chunk_index"],
                "content": chunk["content"],
                "created_at": doc_meta["created_at"].isoformat()
            }

            points.append(
                qmodels.PointStruct(
                    id=point_id,
                    vector=vectors[idx],
                    payload=payload
                )
            )

        try:
            logger.info("Upserting %d vectors into Qdrant collection '%s'...", len(points), self.collection_name)
            await self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            logger.info("Qdrant upsert complete.")
            return point_ids
        except Exception as e:
            logger.error("Failed to insert points into Qdrant: %s", e, exc_info=True)
            raise RuntimeError(f"Qdrant insertion failure: {str(e)}")

    async def delete_chunks_by_document(self, document_id: str, user_id: str) -> None:
        """
        Removes all vectors belonging to a deleted document for a specific user.
        """
        try:
            logger.info("Deleting vectors for document_id=%s, user_id=%s from Qdrant", document_id, user_id)
            # Use FilterSelector to match matching metadata attributes
            await self.client.delete(
                collection_name=self.collection_name,
                points_selector=qmodels.FilterSelector(
                    filter=qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="document_id",
                                match=qmodels.MatchValue(value=document_id)
                            ),
                            qmodels.FieldCondition(
                                key="user_id",
                                match=qmodels.MatchValue(value=user_id)
                            )
                        ]
                    )
                )
            )
            logger.info("Qdrant vectors deleted successfully.")
        except Exception as e:
            logger.error("Failed to delete points from Qdrant for document_id=%s: %s", document_id, e, exc_info=True)
            raise RuntimeError(f"Qdrant deletion failure: {str(e)}")

    async def similarity_search(
        self,
        query_vector: list[float],
        user_id: str,
        limit: int = 5,
        document_id: str | None = None
    ) -> list[dict]:
        """
        Retrieves top-K nearest neighbors. Ensures user isolation.
        Can optionally filter results to a specific document ID.
        """
        # Always filter by user_id to prevent cross-tenant queries
        must_conditions = [
            qmodels.FieldCondition(
                key="user_id",
                match=qmodels.MatchValue(value=user_id)
            )
        ]

        # Prioritize document_id if provided
        if document_id:
            must_conditions.append(
                qmodels.FieldCondition(
                    key="document_id",
                    match=qmodels.MatchValue(value=document_id)
                )
            )

        query_filter = qmodels.Filter(must=must_conditions)

        try:
            logger.info("Searching similarity in Qdrant (limit=%d, document_scope=%s)", limit, document_id)
            results = await self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                query_filter=query_filter,
                limit=limit
            )

            hits = []
            for hit in results.points:
                hits.append({
                    "id": hit.id,
                    "score": hit.score,
                    "payload": hit.payload
                })
            return hits
        except Exception as e:
            logger.error("Qdrant similarity search failed: %s", e, exc_info=True)
            raise RuntimeError(f"Vector search failure: {str(e)}")


vectorstore_service = VectorStoreService()
