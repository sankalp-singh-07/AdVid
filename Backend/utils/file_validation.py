"""Upload validation: size limits, extension allowlist, MIME sniffing."""

from __future__ import annotations

import os

from fastapi import HTTPException, UploadFile, status

from app.config import settings
from utils.constants import SUPPORTED_EXTENSIONS, SUPPORTED_MIME_TYPES
from utils.logger import get_logger

logger = get_logger("file_validation")

# Magic-byte signatures for common office/document types
_SIGNATURES: list[tuple[bytes, set[str]]] = [
    (b"%PDF", {".pdf", "application/pdf"}),
    (b"PK\x03\x04", {".docx", ".pptx", ".xlsx", ".doc", ".ppt", ".xls"}),  # ZIP-based OOXML
    (b"\xd0\xcf\x11\xe0", {".doc", ".xls", ".ppt"}),  # OLE compound
]


def extension_of(filename: str) -> str:
    _, ext = os.path.splitext(filename or "")
    return ext.lower()


def sniff_mime(content_head: bytes, declared: str | None, extension: str) -> str:
    """Best-effort MIME detection from magic bytes + declared type."""
    head = content_head[:16] if content_head else b""

    if head.startswith(b"%PDF"):
        return "application/pdf"
    if head.startswith(b"PK\x03\x04"):
        # ZIP-based; map by extension
        mapping = {
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
        return mapping.get(extension, declared or "application/zip")
    if head.startswith(b"\xd0\xcf\x11\xe0"):
        return declared or "application/msword"

    # Text-ish
    try:
        content_head[:2048].decode("utf-8")
        if extension == ".md":
            return "text/markdown"
        if extension == ".csv":
            return "text/csv"
        return "text/plain"
    except UnicodeDecodeError:
        pass

    return declared or "application/octet-stream"


async def validate_upload(file: UploadFile) -> tuple[bytes, str, str]:
    """
    Validate extension, size, and content type.
    Returns (content_bytes, extension, mime_type).
    """
    filename = file.filename or "unnamed_file"
    ext = extension_of(filename)

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file format '{ext}'. "
                f"Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            ),
        )

    content = await file.read()
    await file.seek(0)

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    mime = sniff_mime(content[:4096], file.content_type, ext)

    # Soft MIME check: reject obvious mismatches for PDF
    if ext == ".pdf" and not content.startswith(b"%PDF"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File extension is .pdf but content is not a valid PDF.",
        )

    # For text formats, ensure decodable
    if ext in {".txt", ".md", ".csv"}:
        try:
            content.decode("utf-8")
        except UnicodeDecodeError:
            # allow other encodings; chardet handles later
            pass

    if mime not in SUPPORTED_MIME_TYPES and mime not in {
        "application/zip",
        "application/octet-stream",
        "application/msword",
    }:
        logger.warning(
            "Unusual MIME type %s for extension %s (filename=%s)",
            mime,
            ext,
            filename,
        )

    return content, ext, mime
