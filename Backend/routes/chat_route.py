from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["Chat"])

class ChatRequest(BaseModel):
    query: str
    conversation_id: str = None

@router.post("/")
async def chat_with_documents(request: ChatRequest):
    """
    Interact with the RAG pipeline.
    TODO for Developer 2:
    - Receive query
    - Call chat_service.py to convert query to embedding
    - Retrieve top-K relevant chunks from Qdrant
    - Pass context + query to Ollama through LangChain
    - Return streaming response or standard response with citations
    """
    return {
        "answer": "This is a dummy response. The RAG pipeline is not yet implemented.",
        "citations": []
    }

@router.get("/history/{conversation_id}")
async def get_chat_history(conversation_id: str):
    """
    Fetch history for a specific conversation.
    """
    return {"history": []}
