from functools import lru_cache

from app.config import settings
from providers.storage.base import StorageProvider
from utils.logger import get_logger

logger = get_logger("storage_factory")


@lru_cache(maxsize=1)
def get_storage_provider() -> StorageProvider:
    """
    Resolve storage implementation from config.
    Change STORAGE_PROVIDER without touching business logic.
    """
    provider = (settings.STORAGE_PROVIDER or "cloudinary").lower().strip()

    if provider == "cloudinary":
        from providers.storage.cloudinary_storage import CloudinaryStorage

        logger.info("Using CloudinaryStorage")
        return CloudinaryStorage()

    if provider == "s3":
        from providers.storage.s3_storage import S3Storage

        logger.info("Using S3Storage")
        return S3Storage()

    if provider == "local":
        from providers.storage.local_storage import LocalStorage

        logger.info("Using LocalStorage")
        return LocalStorage()

    raise RuntimeError(
        f"Unknown STORAGE_PROVIDER '{provider}'. "
        "Supported: cloudinary, s3, local"
    )
