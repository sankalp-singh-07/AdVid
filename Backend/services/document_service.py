import os
import uuid
from fastapi import UploadFile, HTTPException, status, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import async_session
from models.document_model import Document
from models.chunk_model import DocumentChunk
from models.user_model import User
from schemas.document_schema import DocumentUpdateMetadata
from services.storage_service import storage_service
from services.text_extractor import text_extractor
from services.chunker_service import chunker_service
from services.embedding_service import embedding_service
from services.vectorstore_service import vectorstore_service
from utils.constants import SUPPORTED_EXTENSIONS
from utils.logger import get_logger

logger = get_logger("document_service")


async def run_ingestion_pipeline(document_id: str, user_id: str):
    """
    Background worker that runs the document ingestion pipeline:
    Extract text -> Chunks -> Embeddings -> Qdrant -> Postgres metadata -> ready/failed.
    Runs inside a fresh DB session to avoid session lifetime sharing issues.
    """
    logger.info("Starting background ingestion pipeline for document_id=%s...", document_id)
    
    async with async_session() as db:
        # 1. Fetch document
        result = await db.execute(
            select(Document).where(Document.id == document_id, Document.user_id == user_id)
        )
        doc = result.scalars().first()
        if not doc:
            logger.error("Background task: Document %s not found.", document_id)
            return

        try:
            # Update status to processing
            doc.status = "processing"
            db.add(doc)
            await db.commit()
            await db.refresh(doc)

            # 2. Extract text page-by-page
            temp_path = await storage_service.download_temp_file(doc.storage_path, doc.file_type)
            try:
                pages = text_extractor.extract_text(temp_path, doc.file_type)
            finally:
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except Exception as clean_err:
                        logger.warning("Failed to remove temp file %s: %s", temp_path, clean_err)

            # 3. Split into semantic chunks
            chunks = chunker_service.chunk_document(pages)
            if not chunks:
                raise ValueError("No text chunks could be created from document.")

            # 4. Generate embeddings
            chunk_contents = [c["content"] for c in chunks]
            vectors = await embedding_service.get_embeddings(chunk_contents)

            # 5. Insert vectors into Qdrant
            doc_meta = {
                "document_id": doc.id,
                "user_id": user_id,
                "filename": doc.original_filename,
                "department": doc.department,
                "owner": doc.owner,
                "created_at": doc.created_at
            }
            qdrant_point_ids = await vectorstore_service.insert_chunks(chunks, vectors, doc_meta)

            # 6. Save chunks in Postgres database
            db_chunks = []
            for idx, chunk in enumerate(chunks):
                db_chunk = DocumentChunk(
                    document_id=doc.id,
                    user_id=user_id,
                    chunk_index=chunk["chunk_index"],
                    page_number=chunk["page_number"],
                    content=chunk["content"],
                    qdrant_point_id=qdrant_point_ids[idx]
                )
                db_chunks.append(db_chunk)
                db.add(db_chunk)

            # 7. Update document status
            doc.status = "ready"
            doc.chunk_count = len(chunks)
            doc.error_message = None
            db.add(doc)
            
            await db.commit()
            logger.info("Successfully ingested document_id=%s. Total chunks: %d", doc.id, len(chunks))

        except Exception as e:
            logger.error("Ingestion pipeline failed for document_id=%s: %s", document_id, e, exc_info=True)
            # Re-fetch document if transaction was rolled back on error
            try:
                db.add(doc)
                doc.status = "failed"
                doc.error_message = str(e)
                await db.commit()
            except Exception as commit_err:
                logger.error("Failed to mark document status as failed in DB: %s", commit_err)


class DocumentService:
    """
    Coordinates CRUD operations for documents. Handlers off processing to
    the background worker thread.
    """

    async def upload_document(
        self,
        file: UploadFile,
        department: str | None,
        owner: str | None,
        user: User,
        db: AsyncSession,
        background_tasks: BackgroundTasks,
    ) -> Document:
        """
        Validates file metadata, writes file to disk, creates initial document record,
        and triggers background ingestion worker.
        """
        # Validate extension
        filename = file.filename or "unnamed_file"
        _, ext = os.path.splitext(filename)
        ext = ext.lower()
        
        if ext not in SUPPORTED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file format '{ext}'. Supported formats: {', '.join(SUPPORTED_EXTENSIONS)}",
            )

        # Pre-assign file id
        doc_id = str(uuid.uuid4())
        
        # Save file to storage
        storage_result = await storage_service.save_file(user.id, doc_id, file, ext)
        relative_path = storage_result["url"]
        file_size = storage_result["size"]

        try:

            # Create document database entry
            doc = Document(
                id=doc_id,
                user_id=user.id,
                filename=f"{doc_id}{ext}",
                original_filename=filename,
                file_type=ext,
                file_size=file_size,
                storage_path=relative_path,
                status="pending",
                department=department,
                owner=owner
            )
            db.add(doc)
            await db.commit()
            await db.refresh(doc)
            logger.info("Uploaded document record saved. user_id=%s, id=%s", user.id, doc.id)

            # Trigger background pipeline
            background_tasks.add_task(run_ingestion_pipeline, doc.id, user.id)
            return doc

        except Exception as e:
            # Cleanup storage on DB failures
            storage_service.delete_file(relative_path)
            logger.error("Failed to initiate document upload for user_id=%s: %s", user.id, e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save document metadata: {str(e)}",
            )

    async def list_documents(self, user: User, db: AsyncSession) -> dict:
        """
        Retrieves all documents belonging to the user.
        """
        result = await db.execute(
            select(Document)
            .where(Document.user_id == user.id)
            .order_by(Document.created_at.desc())
        )
        documents = result.scalars().all()
        return {
            "documents": documents,
            "total": len(documents)
        }

    async def get_document_by_id(self, document_id: str, user: User, db: AsyncSession) -> Document:
        """
        Fetches a document and raises 404 if not found or unauthorized.
        """
        result = await db.execute(
            select(Document).where(Document.id == document_id, Document.user_id == user.id)
        )
        doc = result.scalars().first()
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or access denied.",
            )
        return doc

    async def delete_document(self, document_id: str, user: User, db: AsyncSession) -> None:
        """
        Removes the document from local storage, removes vectors from Qdrant, and
        cascade deletes chunks and document record from Postgres.
        """
        doc = await self.get_document_by_id(document_id, user, db)

        # 1. Delete physical file
        storage_service.delete_file(doc.storage_path)

        # 2. Delete vectors from Qdrant
        try:
            await vectorstore_service.delete_chunks_by_document(doc.id, user.id)
        except Exception as e:
            logger.warning("Failed to delete Qdrant vectors for doc_id=%s: %s. Continuing database deletion...", doc.id, e)

        # 3. Delete postgres record (cascade deletes chunks automatically via SQLAlchemy mapping)
        await db.delete(doc)
        await db.commit()
        logger.info("Deleted document database record. user_id=%s, id=%s", user.id, document_id)

    async def update_document_metadata(
        self,
        document_id: str,
        meta_data: DocumentUpdateMetadata,
        user: User,
        db: AsyncSession,
    ) -> Document:
        """
        Updates document department/owner metadata.
        """
        doc = await self.get_document_by_id(document_id, user, db)
        
        if meta_data.department is not None:
            doc.department = meta_data.department
        if meta_data.owner is not None:
            doc.owner = meta_data.owner

        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        
        # Note: If this was a production app with heavy metadata querying in Qdrant, we would trigger
        # a background task here to update payloads in Qdrant as well. For now, since the text chunk
        # payload is static, updating the Postgres record is sufficient for doc metadata.
        logger.info("Updated document metadata. user_id=%s, id=%s", user.id, document_id)
        return doc


document_service = DocumentService()
