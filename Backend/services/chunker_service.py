from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings
from utils.logger import get_logger

logger = get_logger("chunker_service")


class ChunkerService:
    """
    Splits extracted document pages into overlapping semantic chunks.

    Uses RecursiveCharacterTextSplitter with paragraph/sentence-aware separators.
    Page numbers are preserved for citations. Adjacent small pages can be merged
    to avoid tiny fragments that hurt retrieval quality.
    """

    def __init__(self) -> None:
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.RAG_CHUNK_SIZE,
            chunk_overlap=settings.RAG_CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""],
        )
        logger.info(
            "ChunkerService chunk_size=%d overlap=%d",
            settings.RAG_CHUNK_SIZE,
            settings.RAG_CHUNK_OVERLAP,
        )

    def chunk_document(self, pages: list[dict]) -> list[dict]:
        """
        Returns list of:
          {chunk_index, page_number, content}
        """
        # Merge very short consecutive pages to improve context continuity
        merged_pages = self._merge_short_pages(pages)

        chunks: list[dict] = []
        chunk_index = 0

        for item in merged_pages:
            page_num = item["page"]
            text = (item.get("text") or "").strip()
            if not text:
                continue

            splits = self.splitter.split_text(text)
            for split in splits:
                cleaned = split.strip()
                if not cleaned:
                    continue
                # Skip near-empty noise
                if len(cleaned) < 40 and not any(c.isalnum() for c in cleaned):
                    continue
                chunks.append(
                    {
                        "chunk_index": chunk_index,
                        "page_number": page_num,
                        "content": cleaned,
                    }
                )
                chunk_index += 1

        logger.info("Chunking completed. Generated %d chunks.", len(chunks))
        return chunks

    def _merge_short_pages(
        self, pages: list[dict], min_chars: int = 200
    ) -> list[dict]:
        if not pages:
            return []
        merged: list[dict] = []
        buffer_text = ""
        buffer_page = pages[0]["page"]

        for item in pages:
            text = (item.get("text") or "").strip()
            if not text:
                continue
            if not buffer_text:
                buffer_text = text
                buffer_page = item["page"]
                continue
            if len(buffer_text) < min_chars:
                buffer_text = f"{buffer_text}\n\n{text}"
            else:
                merged.append({"page": buffer_page, "text": buffer_text})
                buffer_text = text
                buffer_page = item["page"]

        if buffer_text:
            merged.append({"page": buffer_page, "text": buffer_text})
        return merged


chunker_service = ChunkerService()
