from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import BinaryIO


@dataclass
class StoredObject:
    """Provider-agnostic result of a successful upload."""

    url: str
    size: int
    key: str
    provider: str


class StorageProvider(ABC):
    """
    Abstract file storage interface.

    Business logic (document service, ingestion) must only depend on this
    interface so switching Cloudinary → S3 requires config only.
    """

    name: str = "base"

    @abstractmethod
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
        """Persist file bytes and return a storage reference."""

    @abstractmethod
    async def download_to_path(self, storage_url: str, destination_path: str) -> str:
        """Download remote/local object to a local filesystem path."""

    @abstractmethod
    async def delete(self, storage_url: str) -> bool:
        """Delete object. Returns True if deleted or already absent."""

    @abstractmethod
    def get_download_url(self, storage_url: str, expires_in: int = 3600) -> str:
        """Return a URL suitable for temporary client/download access."""
