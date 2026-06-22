# TODO for Developer 2
# 1. Import LangChain document loaders (e.g., PyPDFLoader, Docx2txtLoader, CSVLoader)
# 2. Import LangChain text splitters (e.g., RecursiveCharacterTextSplitter)
# 3. Import OllamaEmbeddings and Qdrant vector store

async def process_and_store_document(file_content: bytes, filename: str, uploader: str):
    """
    Core function for document ingestion.
    
    Steps to implement:
    1. Parse the document based on its extension.
    2. Split the text into semantic chunks with overlap (e.g., chunk_size=1000, overlap=200).
    3. Initialize Ollama embeddings.
    4. Store chunks in Qdrant with metadata (filename, page, section, uploader).
    """
    pass

async def get_all_documents():
    """
    Fetch unique documents from the vector store or relational DB.
    """
    pass
