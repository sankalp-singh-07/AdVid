import os
import re

import aiofiles
import anyio
import cloudinary
import cloudinary.uploader
import cloudinary.utils
import httpx
from fastapi import HTTPException, status

from app.config import settings
from providers.storage.base import StorageProvider, StoredObject
from utils.logger import get_logger

logger = get_logger("cloudinary_storage")


class CloudinaryStorage(StorageProvider):
    name = "cloudinary"

    def __init__(self) -> None:
        if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY:
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True,
            )
            logger.info("CloudinaryStorage initialised.")
        else:
            logger.warning("Cloudinary credentials are not configured.")

    def _public_id_from_url(self, file_url: str) -> str | None:
        match = re.search(r"/raw/upload/(?:v\d+/)?([^?#]+)", file_url)
        return match.group(1) if match else None

    def get_download_url(self, storage_url: str, expires_in: int = 3600) -> str:
        public_id = self._public_id_from_url(storage_url)
        if not public_id:
            return storage_url
        signed_url, _ = cloudinary.utils.cloudinary_url(
            public_id,
            resource_type="raw",
            type="upload",
            sign_url=True,
            secure=True,
        )
        return signed_url

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
        public_id = f"{user_id}/{file_id}"

        def upload_sync():
            return cloudinary.uploader.upload(
                content,
                public_id=public_id,
                resource_type="raw",
                type="upload",
                folder=None,
            )

        try:
            result = await anyio.to_thread.run_sync(upload_sync)
            url = result["secure_url"]
            size = int(result.get("bytes", len(content)))
            logger.info("Uploaded to Cloudinary: %s", url)
            return StoredObject(
                url=url,
                size=size,
                key=public_id,
                provider=self.name,
            )
        except Exception as e:
            logger.error("Cloudinary upload failed: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to store file: {e}",
            ) from e

    async def download_to_path(self, storage_url: str, destination_path: str) -> str:
        download_url = self.get_download_url(storage_url)
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("GET", download_url) as response:
                    if response.status_code != 200:
                        raise RuntimeError(
                            f"Download failed HTTP {response.status_code}"
                        )
                    async with aiofiles.open(destination_path, "wb") as out_file:
                        async for chunk in response.aiter_bytes(chunk_size=1024 * 1024):
                            await out_file.write(chunk)
            return destination_path
        except Exception as e:
            if os.path.exists(destination_path):
                os.remove(destination_path)
            logger.error("Cloudinary download failed: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch document for processing: {e}",
            ) from e

    async def delete(self, storage_url: str) -> bool:
        try:
            public_id = self._public_id_from_url(storage_url)
            if not public_id:
                logger.warning("Could not parse Cloudinary public_id from %s", storage_url)
                return False

            def destroy_sync():
                return cloudinary.uploader.destroy(public_id, resource_type="raw")

            res = await anyio.to_thread.run_sync(destroy_sync)
            ok = res.get("result") == "ok"
            logger.info("Cloudinary delete %s → %s", public_id, res)
            return ok
        except Exception as e:
            logger.error("Cloudinary delete failed: %s", e)
            return False
