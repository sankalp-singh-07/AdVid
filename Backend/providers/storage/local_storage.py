import os
from pathlib import Path

import aiofiles
from fastapi import HTTPException, status

from app.config import settings
from providers.storage.base import StorageProvider, StoredObject
from utils.logger import get_logger

logger = get_logger("local_storage")


class LocalStorage(StorageProvider):
    """Filesystem storage — useful for local dev and offline deployments."""

    name = "local"

    def __init__(self) -> None:
        self.root = Path(settings.STORAGE_PATH).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        logger.info("LocalStorage root=%s", self.root)

    def _path_for(self, user_id: str, file_id: str, extension: str) -> Path:
        folder = self.root / user_id
        folder.mkdir(parents=True, exist_ok=True)
        return folder / f"{file_id}{extension}"

    def _url_for(self, path: Path) -> str:
        return f"local://{path.relative_to(self.root).as_posix()}"

    def _resolve_url(self, storage_url: str) -> Path:
        if storage_url.startswith("local://"):
            relative = storage_url.removeprefix("local://")
            return (self.root / relative).resolve()
        # Absolute path fallback
        return Path(storage_url).resolve()

    async def save(
        self,
        *,
        user_id: str,
        file_id: str,
        content: bytes,
        extension: str,
        content_type: str | None = None,
        filename: str | None = None,
    ) -> StoredObject:
        path = self._path_for(user_id, file_id, extension)
        async with aiofiles.open(path, "wb") as f:
            await f.write(content)
        url = self._url_for(path)
        logger.info("Saved local file %s (%d bytes)", url, len(content))
        return StoredObject(
            url=url,
            size=len(content),
            key=str(path.relative_to(self.root)),
            provider=self.name,
        )

    async def download_to_path(self, storage_url: str, destination_path: str) -> str:
        src = self._resolve_url(storage_url)
        if not src.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Local file not found: {storage_url}",
            )
        async with aiofiles.open(src, "rb") as src_f:
            data = await src_f.read()
        async with aiofiles.open(destination_path, "wb") as dst_f:
            await dst_f.write(data)
        return destination_path

    async def delete(self, storage_url: str) -> bool:
        try:
            path = self._resolve_url(storage_url)
            if path.exists():
                os.remove(path)
            return True
        except Exception as e:
            logger.error("Local delete failed: %s", e)
            return False

    def get_download_url(self, storage_url: str, expires_in: int = 3600) -> str:
        return storage_url
