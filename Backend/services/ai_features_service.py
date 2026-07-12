from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from models.document_model import Document
from models.chunk_model import DocumentChunk
from models.user_model import User
from services.llm_service import llm_service
from utils.logger import get_logger
from langchain_core.messages import SystemMessage, HumanMessage

logger = get_logger("ai_features_service")


class AiFeaturesService:
    """
    Manages document summarization, multi-document comparison, and AI generation tasks
    using ChatOllama LLM.
    """

    async def _get_document_text_context(self, document_id: str, user_id: str, db: AsyncSession, max_chunks: int = 12) -> str:
        """
        Helper that retrieves the first N chunks of a document to build context
        for summary or comparison generation.
        """
        result = await db.execute(
            select(Document).where(Document.id == document_id, Document.user_id == user_id)
        )
        doc = result.scalars().first()
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document '{document_id}' not found.",
            )

        # Retrieve first N chunks
        chunk_result = await db.execute(
            select(DocumentChunk)
            .where(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.chunk_index.asc())
            .limit(max_chunks)
        )
        chunks = chunk_result.scalars().all()
        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Document is empty or not yet processed."
            )

        combined_text = "\n\n".join([f"[Chunk {c.chunk_index}]: {c.content}" for c in chunks])
        return doc.original_filename, combined_text

    async def summarize_document(self, document_id: str, user_id: str, db: AsyncSession) -> str:
        """
        Retrieves document content, builds a summarization instruction prompt,
        and requests the LLM to generate a comprehensive executive summary.
        """
        # 0. Check and deduct credits (cost 5)
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalars().first()
        if not user or user.credits < 5:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits for this AI feature.")
        user.credits -= 5
        db.add(user)

        filename, doc_content = await self._get_document_text_context(document_id, user_id, db)
        
        logger.info("AI Features: Summarizing document '%s'...", filename)

        system_instruction = (
            "You are a professional enterprise document analyzer.\n"
            "Write a clear, structured, and comprehensive executive summary of the provided document text.\n"
            "Highlight the main objective, key findings, bullet-pointed takeaways, and conclusions.\n"
            "Use clear Markdown formatting with headers, bold text, and lists."
        )

        prompt = f"Document Filename: {filename}\n\nDocument Content:\n{doc_content}"

        messages = [
            SystemMessage(content=system_instruction),
            HumanMessage(content=prompt)
        ]

        llm = llm_service.get_model()
        response = await llm.ainvoke(messages)
        return response.content

    async def compare_documents(
        self, 
        doc_id_1: str, 
        doc_id_2: str, 
        user_id: str, 
        db: AsyncSession
    ) -> str:
        """
        Compares two documents. Analyzes similarities, differences, contrasts,
        and merges overlapping viewpoints.
        """
        # 0. Check and deduct credits (cost 5)
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalars().first()
        if not user or user.credits < 5:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits for this AI feature.")
        user.credits -= 5
        db.add(user)

        name1, text1 = await self._get_document_text_context(doc_id_1, user_id, db, max_chunks=8)
        name2, text2 = await self._get_document_text_context(doc_id_2, user_id, db, max_chunks=8)

        logger.info("AI Features: Comparing document '%s' and '%s'...", name1, name2)

        system_instruction = (
            "You are a senior business intelligence analyst.\n"
            "Analyze and compare the two provided documents.\n"
            "Create a structured comparison report outlining:\n"
            "1. Executive Summary: Overlapping themes and differences\n"
            "2. Comparative Matrix: Key points side-by-side (using a Markdown table)\n"
            "3. Deep Dive Analysis: Where they align and where they contrast or conflict\n"
            "4. Synthesis/Recommendations: Conclusions derived from both documents\n"
            "Use Markdown format for the response."
        )

        prompt = (
            f"DOCUMENT 1: {name1}\n"
            f"Content:\n{text1}\n\n"
            f"DOCUMENT 2: {name2}\n"
            f"Content:\n{text2}"
        )

        messages = [
            SystemMessage(content=system_instruction),
            HumanMessage(content=prompt)
        ]

        llm = llm_service.get_model()
        response = await llm.ainvoke(messages)
        return response.content

    async def generate_document(
        self,
        doc_type: str,
        instructions: str,
        document_id: str | None,
        user_id: str,
        db: AsyncSession
    ) -> str:
        """
        Generates a new business document (FAQ, SOP, Policy, Meeting Notes)
        optionally grounded in the context of an uploaded source document.
        """
        # 0. Check and deduct credits (cost 5)
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalars().first()
        if not user or user.credits < 5:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits for this AI feature.")
        user.credits -= 5
        db.add(user)

        context_doc_name = "None"
        context_text = "No reference document provided."

        if document_id:
            context_doc_name, context_text = await self._get_document_text_context(document_id, user_id, db, max_chunks=10)

        logger.info("AI Features: Generating document of type '%s'...", doc_type)

        # Select prompt structure based on template request
        templates = {
            "faq": (
                "Generate a detailed Frequently Asked Questions (FAQ) list.\n"
                "Formulate practical questions and precise answers based on the reference context."
            ),
            "policy": (
                "Generate a formal corporate Policy document.\n"
                "Include standard headings: Policy Statement, Scope, Objective, Rules/Compliance, and Sanctions.\n"
                "Ensure it matches professional legal/compliance standards."
            ),
            "sop": (
                "Generate a step-by-step Standard Operating Procedure (SOP) manual.\n"
                "Organize it logically: Scope, Roles/Responsibilities, Prerequisites, and Step-by-Step Instructions.\n"
                "Make instructions actionable, clear, and sequential."
            ),
            "meeting_notes": (
                "Format unstructured data into professional Meeting Notes.\n"
                "Provide a neat summary with:\n"
                "- Date & Participants placeholders\n"
                "- Executive Summary of discussions\n"
                "- Detailed Decisions made\n"
                "- Action Items table (Task, Assignee, Due Date)"
            )
        }

        template_guideline = templates.get(
            doc_type.lower(), 
            "Generate a professional document based on user instructions."
        )

        system_instruction = (
            "You are a professional business document writer.\n"
            f"{template_guideline}\n"
            "Format the output entirely in professional Markdown.\n"
            "Ensure the generated document is complete, formatted, and ready for copy-paste."
        )

        prompt = (
            f"Reference Document Context (if any): {context_doc_name}\n"
            f"Context details:\n{context_text}\n\n"
            f"User guidelines/additional instructions:\n{instructions}"
        )

        messages = [
            SystemMessage(content=system_instruction),
            HumanMessage(content=prompt)
        ]

        llm = llm_service.get_model()
        response = await llm.ainvoke(messages)
        return response.content


ai_features_service = AiFeaturesService()
