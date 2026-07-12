import os
import uuid
from datetime import datetime, timezone

from fastapi import BackgroundTasks, HTTPException, UploadFile, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import async_session
from models.chunk_model import DocumentChunk
from models.document_model import Document
from models.user_model import User
from schemas.document_schema import DocumentUpdateMetadata
from services.chunker_service import chunker_service
from services.credit_service import deduct_credits, require_credits, upload_credit_cost
from services.embedding_service import embedding_service
from services.knowledge_base_service import knowledge_base_service
from services.storage_service import storage_service
from services.text_extractor import text_extractor
from services.vectorstore_service import vectorstore_service
from utils.file_validation import validate_upload
from utils.logger import get_logger

logger = get_logger("document_service")


async def _set_progress(
    db: AsyncSession,
    doc: Document,
    *,
    status_value: str | None = None,
    progress: int | None = None,
    stage: str | None = None,
    error_message: str | None = None,
    chunk_count: int | None = None,
) -> None:
    if status_value is not None:
        doc.status = status_value
    if progress is not None:
        doc.progress = max(0, min(100, progress))
    if stage is not None:
        doc.stage = stage
    if error_message is not None:
        doc.error_message = error_message
    if chunk_count is not None:
        doc.chunk_count = chunk_count
    doc.updated_at = datetime.now(timezone.utc)
    db.add(doc)
    await db.commit()
    await db.refresh(doc)


async def run_ingestion_pipeline(
    document_id: str, user_id: str, *, force: bool = False
) -> None:
    """
    Background ingestion with staged progress updates.
    Stages: extracting → chunking → embedding → indexing → done
    """
    logger.info("Ingestion start document_id=%s force=%s", document_id, force)

    async with async_session() as db:
        result = await db.execute(
            select(Document).where(
                Document.id == document_id, Document.user_id == user_id
            )
        )
        doc = result.scalars().first()
        if not doc:
            logger.error("Ingestion: document %s not found", document_id)
            return

        if doc.status == "cancelled" and not force:
            logger.info("Ingestion skipped (cancelled): %s", document_id)
            return

        try:
            await _set_progress(
                db, doc, status_value="processing", progress=5, stage="extracting",
                error_message=None,
            )

            temp_path = await storage_service.download_temp_file(
                doc.storage_path, doc.file_type
            )
            try:
                await _set_progress(db, doc, progress=15, stage="extracting")
                pages = text_extractor.extract_text(temp_path, doc.file_type)
            finally:
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except Exception as clean_err:
                        logger.warning("Temp cleanup failed: %s", clean_err)

            # Re-check cancellation
            await db.refresh(doc)
            if doc.status == "cancelled":
                return

            await _set_progress(db, doc, progress=30, stage="chunking")
            chunks = chunker_service.chunk_document(pages)
            if not chunks:
                raise ValueError("No text chunks could be created from document.")

            await _set_progress(
                db, doc, progress=40, stage="embedding", chunk_count=len(chunks)
            )
            chunk_contents = [c["content"] for c in chunks]
            vectors = await embedding_service.get_embeddings(chunk_contents)

            await db.refresh(doc)
            if doc.status == "cancelled":
                return

            await _set_progress(db, doc, progress=75, stage="indexing")

            # Clear previous vectors on retry
            try:
                await vectorstore_service.delete_chunks_by_document(doc.id, user_id)
            except Exception:
                pass

            # Clear previous chunk rows on retry
            existing_chunks = await db.execute(
                select(DocumentChunk).where(DocumentChunk.document_id == doc.id)
            )
            for row in existing_chunks.scalars().all():
                await db.delete(row)
            await db.commit()

            doc_meta = {
                "document_id": doc.id,
                "user_id": user_id,
                "knowledge_base_id": doc.knowledge_base_id,
                "filename": doc.original_filename,
                "department": doc.department,
                "owner": doc.owner,
                "created_at": doc.created_at,
            }
            qdrant_point_ids = await vectorstore_service.insert_chunks(
                chunks, vectors, doc_meta
            )

            for idx, chunk in enumerate(chunks):
                db.add(
                    DocumentChunk(
                        document_id=doc.id,
                        user_id=user_id,
                        chunk_index=chunk["chunk_index"],
                        page_number=chunk["page_number"],
                        content=chunk["content"],
                        qdrant_point_id=qdrant_point_ids[idx],
                    )
                )

            await _set_progress(
                db,
                doc,
                status_value="ready",
                progress=100,
                stage="done",
                error_message=None,
                chunk_count=len(chunks),
            )
            logger.info(
                "Ingestion complete document_id=%s chunks=%d", doc.id, len(chunks)
            )

        except Exception as e:
            logger.error(
                "Ingestion failed document_id=%s: %s", document_id, e, exc_info=True
            )
            try:
                result = await db.execute(
                    select(Document).where(Document.id == document_id)
                )
                doc = result.scalars().first()
                if doc and doc.status != "cancelled":
                    await _set_progress(
                        db,
                        doc,
                        status_value="failed",
                        stage="failed",
                        error_message=str(e)[:2000],
                    )
            except Exception as commit_err:
                logger.error("Failed to mark document failed: %s", commit_err)


class DocumentService:
    async def upload_document(
        self,
        file: UploadFile,
        department: str | None,
        owner: str | None,
        user: User,
        db: AsyncSession,
        background_tasks: BackgroundTasks,
        knowledge_base_id: str | None = None,
    ) -> Document:
        content, ext, mime = await validate_upload(file)
        cost = upload_credit_cost()
        billed_user = await require_credits(
            user.id, db, amount=cost, action=f"document upload ({cost} credits)"
        )

        kb_id = await knowledge_base_service.resolve_kb_id(
            user.id, db, knowledge_base_id
        )

        doc_id = str(uuid.uuid4())
        storage_result = await storage_service.save_bytes(
            user_id=user.id,
            file_id=doc_id,
            content=content,
            extension=ext,
            mime_type=mime,
            filename=file.filename,
        )

        try:
            doc = Document(
                id=doc_id,
                user_id=user.id,
                knowledge_base_id=kb_id,
                filename=f"{doc_id}{ext}",
                original_filename=file.filename or f"file{ext}",
                file_type=ext,
                file_size=storage_result["size"],
                storage_path=storage_result["url"],
                mime_type=mime,
                status="pending",
                progress=0,
                stage="uploaded",
                department=department,
                owner=owner or user.name,
            )
            db.add(doc)
            await deduct_credits(
                billed_user, db, cost, reason=f"upload doc={doc_id}"
            )
            await db.commit()
            await db.refresh(doc)
            # Expose credit info for clients that read response extras
            doc._credits_charged = cost  # type: ignore[attr-defined]
            doc._credits_remaining = billed_user.credits  # type: ignore[attr-defined]
            logger.info(
                "Upload saved user=%s doc=%s kb=%s credits=%d",
                user.id,
                doc.id,
                kb_id,
                cost,
            )
            background_tasks.add_task(run_ingestion_pipeline, doc.id, user.id)
            return doc
        except Exception as e:
            await storage_service.delete_file_async(storage_result["url"])
            logger.error("Upload metadata failed: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save document metadata: {e}",
            ) from e

    async def list_documents(
        self,
        user: User,
        db: AsyncSession,
        *,
        knowledge_base_id: str | None = None,
        search: str | None = None,
        department: str | None = None,
        status_filter: str | None = None,
        file_type: str | None = None,
        owner: str | None = None,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        conditions = [Document.user_id == user.id]

        if knowledge_base_id:
            conditions.append(Document.knowledge_base_id == knowledge_base_id)
        if department and department.lower() != "all":
            conditions.append(Document.department == department)
        if status_filter and status_filter.lower() != "all":
            # Map UI labels
            status_map = {
                "indexed": "ready",
                "ready": "ready",
                "processing": "processing",
                "failed": "failed",
                "pending": "pending",
            }
            mapped = status_map.get(status_filter.lower(), status_filter.lower())
            conditions.append(Document.status == mapped)
        if file_type and file_type.lower() != "all":
            ft = file_type.lower().lstrip(".")
            conditions.append(
                or_(
                    Document.file_type == f".{ft}",
                    Document.file_type == ft,
                    Document.original_filename.ilike(f"%.{ft}"),
                )
            )
        if owner:
            conditions.append(Document.owner.ilike(f"%{owner}%"))
        if search:
            term = f"%{search.strip()}%"
            conditions.append(
                or_(
                    Document.original_filename.ilike(term),
                    Document.department.ilike(term),
                    Document.owner.ilike(term),
                )
            )

        count_stmt = select(func.count(Document.id)).where(and_(*conditions))
        total = (await db.execute(count_stmt)).scalar() or 0

        sort_col = {
            "created_at": Document.created_at,
            "updated_at": Document.updated_at,
            "name": Document.original_filename,
            "size": Document.file_size,
            "status": Document.status,
        }.get(sort_by, Document.created_at)

        order = sort_col.desc() if sort_dir.lower() == "desc" else sort_col.asc()

        result = await db.execute(
            select(Document)
            .where(and_(*conditions))
            .order_by(order)
            .limit(min(limit, 200))
            .offset(max(offset, 0))
        )
        documents = result.scalars().all()
        return {
            "documents": documents,
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    async def get_document_by_id(
        self, document_id: str, user: User, db: AsyncSession
    ) -> Document:
        result = await db.execute(
            select(Document).where(
                Document.id == document_id, Document.user_id == user.id
            )
        )
        doc = result.scalars().first()
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or access denied.",
            )
        return doc

    async def delete_document(
        self, document_id: str, user: User, db: AsyncSession
    ) -> None:
        doc = await self.get_document_by_id(document_id, user, db)
        await storage_service.delete_file_async(doc.storage_path)
        try:
            await vectorstore_service.delete_chunks_by_document(doc.id, user.id)
        except Exception as e:
            logger.warning("Qdrant cleanup warning doc=%s: %s", doc.id, e)
        await db.delete(doc)
        await db.commit()
        logger.info("Deleted document %s", document_id)

    async def update_document_metadata(
        self,
        document_id: str,
        meta_data: DocumentUpdateMetadata,
        user: User,
        db: AsyncSession,
    ) -> Document:
        doc = await self.get_document_by_id(document_id, user, db)
        if meta_data.department is not None:
            doc.department = meta_data.department
        if meta_data.owner is not None:
            doc.owner = meta_data.owner
        if getattr(meta_data, "knowledge_base_id", None) is not None:
            await knowledge_base_service.get_knowledge_base(
                meta_data.knowledge_base_id, user.id, db
            )
            doc.knowledge_base_id = meta_data.knowledge_base_id
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        return doc

    async def cancel_ingestion(
        self, document_id: str, user: User, db: AsyncSession
    ) -> Document:
        doc = await self.get_document_by_id(document_id, user, db)
        if doc.status not in ("pending", "processing"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only pending/processing documents can be cancelled.",
            )
        doc.status = "cancelled"
        doc.stage = "cancelled"
        doc.error_message = "Cancelled by user"
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        return doc

    async def retry_ingestion(
        self,
        document_id: str,
        user: User,
        db: AsyncSession,
        background_tasks: BackgroundTasks,
    ) -> Document:
        doc = await self.get_document_by_id(document_id, user, db)
        if doc.status not in ("failed", "cancelled", "ready"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document is not in a retriable state.",
            )
        doc.status = "pending"
        doc.progress = 0
        doc.stage = "queued"
        doc.error_message = None
        doc.retry_count = (doc.retry_count or 0) + 1
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        background_tasks.add_task(
            run_ingestion_pipeline, doc.id, user.id, force=True
        )
        return doc


document_service = DocumentService()
