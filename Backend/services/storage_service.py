"""
Storage service facade.

Business code should import `storage_service` — never Cloudinary/S3 clients directly.
Provider is selected via STORAGE_PROVIDER config.
"""

import os
import tempfile

from fastapi import UploadFile

from providers.storage import get_storage_provider
from utils.logger import get_logger

logger = get_logger("storage_service")


class StorageService:
    """Thin adapter preserving the existing service API over StorageProvider."""

    def __init__(self) -> None:
        self._provider = get_storage_provider()
        logger.info("StorageService using provider=%s", self._provider.name)

    @property
    def provider_name(self) -> str:
        return self._provider.name

    async def save_file(
        self,
        user_id: str,
        file_id: str,
        file: UploadFile,
        extension: str,
        content: bytes | None = None,
        mime_type: str | None = None,
    ) -> dict:
        if content is None:
            content = await file.read()
            await file.seek(0)

        stored = await self._provider.save(
            user_id=user_id,
            file_id=file_id,
            content=content,
            extension=extension,
            content_type=mime_type or file.content_type,
            filename=file.filename,
        )
        return {"url": stored.url, "size": stored.size, "key": stored.key}

    async def save_bytes(
        self,
        user_id: str,
        file_id: str,
        content: bytes,
        extension: str,
        mime_type: str | None = None,
        filename: str | None = None,
    ) -> dict:
        stored = await self._provider.save(
            user_id=user_id,
            file_id=file_id,
            content=content,
            extension=extension,
            content_type=mime_type,
            filename=filename,
        )
        return {"url": stored.url, "size": stored.size, "key": stored.key}

    async def download_temp_file(self, file_url: str, extension: str = ".tmp") -> str:
        temp_dir = os.path.abspath("./temp_uploads")
        os.makedirs(temp_dir, exist_ok=True)
        fd, temp_path = tempfile.mkstemp(suffix=extension, dir=temp_dir)
        os.close(fd)
        return await self._provider.download_to_path(file_url, temp_path)

    async def delete_file_async(self, file_url: str) -> bool:
        return await self._provider.delete(file_url)

    def delete_file(self, file_url: str) -> bool:
        """Sync wrapper for existing call sites; prefers async path internally."""
        import anyio

        try:
            return anyio.from_thread.run(self._provider.delete, file_url)
        except RuntimeError:
            # Already in async event loop — fire and forget is not ideal;
            # callers in async context should use delete_file_async.
            import asyncio

            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # Schedule and assume success; log for visibility
                    asyncio.create_task(self._provider.delete(file_url))
                    return True
                return loop.run_until_complete(self._provider.delete(file_url))
            except Exception as e:
                logger.error("delete_file failed: %s", e)
                return False

    def get_download_url(self, file_url: str, expires_in: int = 3600) -> str:
        return self._provider.get_download_url(file_url, expires_in=expires_in)


storage_service = StorageService()
