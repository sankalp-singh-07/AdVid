from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import settings
from utils.logger import get_logger

logger = get_logger("chunker_service")


class ChunkerService:
    """
    Splits extracted document pages into semantic chunks using LangChain's
    RecursiveCharacterTextSplitter. Preserves page information for accurate citation support.
    """

    def __init__(self):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.RAG_CHUNK_SIZE,
            chunk_overlap=settings.RAG_CHUNK_OVERLAP,
            length_function=len,  # splits based on character length
        )
        logger.info(
            "ChunkerService configured with chunk_size=%d, chunk_overlap=%d",
            settings.RAG_CHUNK_SIZE,
            settings.RAG_CHUNK_OVERLAP,
        )

    def chunk_document(self, pages: list[dict]) -> list[dict]:
        """
        Splits text page-by-page to guarantee that each chunk maps to exactly
        one page. This enables precise page citations in Phase 3.
        Returns:
            list[dict]: [{"chunk_index": idx, "page_number": page, "content": text}]
        """
        chunks = []
        chunk_index = 0

        for item in pages:
            page_num = item["page"]
            text = item["text"]

            if not text.strip():
                continue

            # Perform splitting on the single page
            splits = self.splitter.split_text(text)
            for split in splits:
                split_cleaned = split.strip()
                if split_cleaned:
                    chunks.append({
                        "chunk_index": chunk_index,
                        "page_number": page_num,
                        "content": split_cleaned
                    })
                    chunk_index += 1

        logger.info("Semantic chunking completed. Generated %d chunks.", len(chunks))
        return chunks


chunker_service = ChunkerService()
