from fastapi import APIRouter, UploadFile, File, Depends
from typing import List

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a document (PDF, DOCX, etc.).
    TODO for Developer 2:
    - Pass the file to document_service.py
    - Chunk the file using LangChain
    - Generate embeddings using Ollama
    - Store chunks in Qdrant with metadata
    """
    return {"message": "Document uploaded successfully", "filename": file.filename}

@router.get("/")
async def list_documents():
    """
    List all uploaded documents.
    TODO for Developer 2:
    - Fetch distinct documents and metadata from DB/Qdrant
    """
    return {"documents": []}
