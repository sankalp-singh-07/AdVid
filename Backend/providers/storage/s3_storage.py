"""
AWS S3 / MinIO storage provider.

Fully wired for future migration. Activated when STORAGE_PROVIDER=s3 and
boto3 is installed with valid credentials.
"""

from __future__ import annotations

import os
from urllib.parse import urlparse

import aiofiles
from fastapi import HTTPException, status

from app.config import settings
from providers.storage.base import StorageProvider, StoredObject
from utils.logger import get_logger

logger = get_logger("s3_storage")


class S3Storage(StorageProvider):
    name = "s3"

    def __init__(self) -> None:
        if not settings.S3_BUCKET:
            raise RuntimeError("S3_BUCKET is required when STORAGE_PROVIDER=s3")

        try:
            import boto3
            from botocore.config import Config
        except ImportError as e:
            raise RuntimeError(
                "boto3 is required for S3 storage. Install with: pip install boto3"
            ) from e

        client_kwargs: dict = {
            "service_name": "s3",
            "region_name": settings.S3_REGION,
            "config": Config(signature_version="s3v4"),
        }
        if settings.S3_ACCESS_KEY_ID and settings.S3_SECRET_ACCESS_KEY:
            client_kwargs["aws_access_key_id"] = settings.S3_ACCESS_KEY_ID
            client_kwargs["aws_secret_access_key"] = settings.S3_SECRET_ACCESS_KEY
        if settings.S3_ENDPOINT_URL:
            client_kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL

        self._client = boto3.client(**client_kwargs)
        self.bucket = settings.S3_BUCKET
        self.prefix = settings.S3_PREFIX.strip("/")
        logger.info("S3Storage initialised bucket=%s prefix=%s", self.bucket, self.prefix)

    def _object_key(self, user_id: str, file_id: str, extension: str) -> str:
        return f"{self.prefix}/{user_id}/{file_id}{extension}"

    def _url_for_key(self, key: str) -> str:
        return f"s3://{self.bucket}/{key}"

    def _key_from_url(self, storage_url: str) -> str:
        if storage_url.startswith("s3://"):
            # s3://bucket/key
            without = storage_url.removeprefix("s3://")
            parts = without.split("/", 1)
            if len(parts) == 2:
                return parts[1]
        parsed = urlparse(storage_url)
        return parsed.path.lstrip("/")

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
        import anyio

        key = self._object_key(user_id, file_id, extension)
        extra = {}
        if content_type:
            extra["ContentType"] = content_type
        if filename:
            extra["Metadata"] = {"original-filename": filename}

        def put():
            self._client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=content,
                **extra,
            )

        try:
            await anyio.to_thread.run_sync(put)
            url = self._url_for_key(key)
            logger.info("Uploaded to S3: %s", url)
            return StoredObject(
                url=url,
                size=len(content),
                key=key,
                provider=self.name,
            )
        except Exception as e:
            logger.error("S3 upload failed: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to store file in S3: {e}",
            ) from e

    async def download_to_path(self, storage_url: str, destination_path: str) -> str:
        import anyio

        key = self._key_from_url(storage_url)

        def download():
            self._client.download_file(self.bucket, key, destination_path)

        try:
            await anyio.to_thread.run_sync(download)
            return destination_path
        except Exception as e:
            if os.path.exists(destination_path):
                os.remove(destination_path)
            logger.error("S3 download failed: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch document from S3: {e}",
            ) from e

    async def delete(self, storage_url: str) -> bool:
        import anyio

        key = self._key_from_url(storage_url)

        def delete_obj():
            self._client.delete_object(Bucket=self.bucket, Key=key)

        try:
            await anyio.to_thread.run_sync(delete_obj)
            return True
        except Exception as e:
            logger.error("S3 delete failed: %s", e)
            return False

    def get_download_url(self, storage_url: str, expires_in: int = 3600) -> str:
        key = self._key_from_url(storage_url)
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )
