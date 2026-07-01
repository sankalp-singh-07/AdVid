from app.config import settings
from services.embedding_service import embedding_service
from services.vectorstore_service import vectorstore_service
from services.llm_service import llm_service
from utils.logger import get_logger
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

logger = get_logger("rag_service")


class RagService:
    """
    RAG Pipeline orchestration service.
    Retrieves semantic chunks from Qdrant, applies domain rules,
    constructs RAG context prompts, and runs Ollama Chat LLM.
    """

    async def retrieve_context(
        self, 
        query: str, 
        user_id: str, 
        document_id: str | None = None
    ) -> list[dict]:
        """
        Retrieves top-K semantic chunks. If document_id is specified, prioritises
        retrieval from that document first. Searches entire user knowledge base only
        if the scoped search yields insufficient context.
        """
        # Embed user query
        query_vector = await embedding_service.get_query_embedding(query)

        results = []
        if document_id:
            logger.info("RAG: Performing scoped search in document_id=%s", document_id)
            results = await vectorstore_service.similarity_search(
                query_vector=query_vector,
                user_id=user_id,
                limit=settings.RAG_TOP_K,
                document_id=document_id
            )
            
            # If we found chunks in the scoped document with a confidence score > 0.40,
            # we do not search the rest of the database.
            has_strong_match = any(hit["score"] > 0.40 for hit in results)
            if results and has_strong_match:
                logger.info("RAG: Strong scoped match found. Skipping global search.")
                return results

            logger.info("RAG: Scoped matches were empty or weak. Expanding search to entire knowledge base.")

        # Global search (unscoped, but isolated to current user)
        global_results = await vectorstore_service.similarity_search(
            query_vector=query_vector,
            user_id=user_id,
            limit=settings.RAG_TOP_K
        )
        
        # Combine scoped and global results if scoped results exist, sorting by score
        if results:
            seen_ids = {hit["id"] for hit in results}
            for hit in global_results:
                if hit["id"] not in seen_ids:
                    results.append(hit)
            results.sort(key=lambda x: x["score"], reverse=True)
            return results[:settings.RAG_TOP_K]
            
        return global_results

    def build_system_prompt(self, context_chunks: list[dict]) -> str:
        """
        Builds the system prompt with context chunk attachments.
        """
        context_str = ""
        for idx, chunk in enumerate(context_chunks):
            payload = chunk["payload"]
            context_str += (
                f"\n--- CONTEXT SOURCE [{idx + 1}] ---\n"
                f"Filename: {payload['filename']}\n"
                f"Page Number: {payload['page']}\n"
                f"Content snippet: {payload['content']}\n"
                f"---------------------------\n"
            )

        system_instruction = (
            "You are a helpful and precise Enterprise AI Knowledge Assistant.\n"
            "Use the provided context sources to answer the user's question.\n\n"
            "CRITICAL RULES:\n"
            "1. Base your answer strictly on the provided context sources. Do not assume or extrapolate.\n"
            "2. If the context does not contain the answer, say exactly: "
            "'I cannot find the answer in the provided documents.' and nothing else.\n"
            "3. Cite your sources in the text using bracket numbers matching the context index (e.g. [1], [2]).\n"
            "4. Keep your answer professional, accurate, and concise.\n\n"
            f"Here is the context data:\n{context_str}"
        )
        return system_instruction

    async def execute_rag(
        self,
        query: str,
        user_id: str,
        history: list[dict],
        document_id: str | None = None
    ) -> tuple[str, list[dict]]:
        """
        Executes the full RAG pipeline.
        Returns:
            tuple: (answer_string, citations_list)
        """
        # 1. Retrieve context chunks
        context_chunks = await self.retrieve_context(query, user_id, document_id)
        
        # 2. Build prompts
        system_content = self.build_system_prompt(context_chunks)
        
        # 3. Format message history for LangChain
        messages = [SystemMessage(content=system_content)]
        
        # Add history (last 10 messages to keep context window manageable)
        for msg in history[-10:]:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))
                
        # Add current query
        messages.append(HumanMessage(content=query))

        # 4. Generate answer via LLM
        logger.info("RAG: Dispatching prompt to Ollama model '%s'...", settings.OLLAMA_MODEL)
        llm = llm_service.get_model()
        response = await llm.ainvoke(messages)
        answer = response.content

        # 5. Extract citations metadata
        citations = []
        for hit in context_chunks:
            payload = hit["payload"]
            citations.append({
                "filename": payload["filename"],
                "page": payload["page"],
                "score": round(hit["score"], 4),
                "content": payload["content"],
                "document_id": payload.get("document_id")
            })

        logger.info("RAG: Response generated. Citations gathered: %d", len(citations))
        return answer, citations


rag_service = RagService()
