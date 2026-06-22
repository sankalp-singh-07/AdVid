# TODO for Developer 2
# 1. Import LangChain QA chains (e.g., ConversationalRetrievalChain)
# 2. Import Ollama LLM wrapper

async def generate_rag_response(query: str, chat_history: list):
    """
    Core RAG function.
    
    Steps to implement:
    1. Embed the user query using OllamaEmbeddings.
    2. Query Qdrant for top-K matching chunks.
    3. Construct a prompt containing the context chunks and the user query.
    4. Send the prompt to the Ollama LLM.
    5. Return the answer along with the source documents (citations).
    
    Bonus: Implement hybrid routing. If query asks about Workday, 
    route to workday_service instead.
    """
    pass
