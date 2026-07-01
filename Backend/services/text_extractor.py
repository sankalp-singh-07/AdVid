import os
import pypdf
import docx
import pptx
import pandas as pd
import chardet
import re
from fastapi import HTTPException, status
from utils.logger import get_logger

logger = get_logger("text_extractor")


class TextExtractor:
    """
    Service responsible for parsing and extracting raw text from various document formats.
    Supports PDF, DOCX, TXT, Markdown, PPTX, CSV, and Excel.
    Preserves page boundaries (or synthesises them) for citations.
    """

    def clean_text(self, text: str) -> str:
        """
        Cleans and normalizes extracted text.
        Removes excessive whitespaces, non-printable chars, and formatting garbage.
        """
        if not text:
            return ""
        # Replace multiple spaces/newlines with single ones
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n\s*\n+", "\n\n", text)
        return text.strip()

    def extract_text(self, file_path: str, file_type: str) -> list[dict]:
        """
        Dispatches extraction based on file extension.
        Returns a list of dicts: [{"page": page_number, "text": cleaned_text}]
        """
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File not found on disk at {file_path}",
            )

        file_type = file_type.lower()
        logger.info("Extracting text from: %s (type: %s)", file_path, file_type)

        try:
            if file_type == ".pdf":
                extracted = self._extract_pdf(file_path)
            elif file_type in [".docx", ".doc"]:
                extracted = self._extract_docx(file_path)
            elif file_type in [".pptx", ".ppt"]:
                extracted = self._extract_pptx(file_path)
            elif file_type in [".xlsx", ".xls"]:
                extracted = self._extract_excel(file_path)
            elif file_type == ".csv":
                extracted = self._extract_csv(file_path)
            elif file_type in [".txt", ".md"]:
                extracted = self._extract_txt(file_path)
            else:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=f"Unsupported file type: {file_type}",
                )

            # Post-processing: clean text for all pages
            cleaned = []
            for item in extracted:
                cleaned_text = self.clean_text(item["text"])
                if cleaned_text:  # ignore completely empty pages
                    cleaned.append({
                        "page": item["page"],
                        "text": cleaned_text
                    })

            if not cleaned:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Document does not contain any readable text.",
                )

            logger.info("Successfully extracted text from %s. Total pages: %d", file_path, len(cleaned))
            return cleaned

        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to extract text from %s: %s", file_path, e, exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Corrupted or invalid document file: {str(e)}",
            )

    def _extract_pdf(self, path: str) -> list[dict]:
        pages = []
        with open(path, "rb") as f:
            try:
                reader = pypdf.PdfReader(f)
                total_pages = len(reader.pages)
                if total_pages == 0:
                    raise Exception("PDF file has 0 pages")
                
                for idx, page in enumerate(reader.pages):
                    text = page.extract_text() or ""
                    pages.append({"page": idx + 1, "text": text})
            except Exception as e:
                raise Exception(f"Failed to parse PDF format: {str(e)}")
        return pages

    def _extract_docx(self, path: str) -> list[dict]:
        doc = docx.Document(path)
        pages = []
        current_page_paragraphs = []
        page_counter = 1
        
        # docx has no strict "page" concept, group every 15 paragraphs as a "virtual page"
        for idx, para in enumerate(doc.paragraphs):
            if para.text.strip():
                current_page_paragraphs.append(para.text)
            
            if len(current_page_paragraphs) >= 15:
                pages.append({
                    "page": page_counter,
                    "text": "\n".join(current_page_paragraphs)
                })
                current_page_paragraphs = []
                page_counter += 1
                
        if current_page_paragraphs:
            pages.append({
                "page": page_counter,
                "text": "\n".join(current_page_paragraphs)
            })
            
        # Also extract text from tables
        table_texts = []
        for table in doc.tables:
            for row in table.rows:
                row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_text:
                    table_texts.append(" | ".join(row_text))
        
        if table_texts and pages:
            # Append tables to the last page or create a separate virtual page
            pages.append({
                "page": page_counter + 1,
                "text": "DOCX Tables:\n" + "\n".join(table_texts)
            })
            
        return pages

    def _extract_pptx(self, path: str) -> list[dict]:
        prs = pptx.Presentation(path)
        pages = []
        for idx, slide in enumerate(prs.slides):
            slide_text = []
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    slide_text.append(shape.text.strip())
            pages.append({
                "page": idx + 1,
                "text": "\n".join(slide_text)
            })
        return pages

    def _extract_excel(self, path: str) -> list[dict]:
        xls = pd.ExcelFile(path)
        pages = []
        for idx, sheet_name in enumerate(xls.sheet_names):
            df = pd.read_excel(xls, sheet_name=sheet_name)
            # Replace NaN with empty string
            df = df.fillna("")
            text = f"Sheet: {sheet_name}\n" + df.to_string(index=False)
            pages.append({
                "page": idx + 1,
                "text": text
            })
        return pages

    def _extract_csv(self, path: str) -> list[dict]:
        df = pd.read_csv(path)
        df = df.fillna("")
        text = df.to_string(index=False)
        return [{"page": 1, "text": text}]

    def _extract_txt(self, path: str) -> list[dict]:
        with open(path, "rb") as f:
            raw_data = f.read()
        
        # Detect encoding
        result = chardet.detect(raw_data)
        encoding = result["encoding"] or "utf-8"
        
        try:
            text = raw_data.decode(encoding)
        except Exception:
            text = raw_data.decode("utf-8", errors="ignore")
            
        lines = text.splitlines()
        pages = []
        lines_per_page = 40  # group every 40 lines as a virtual page
        
        for idx in range(0, len(lines), lines_per_page):
            page_lines = lines[idx : idx + lines_per_page]
            pages.append({
                "page": (idx // lines_per_page) + 1,
                "text": "\n".join(page_lines)
            })
            
        return pages


text_extractor = TextExtractor()
