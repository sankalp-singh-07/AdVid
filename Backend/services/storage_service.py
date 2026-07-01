import os
import aiofiles
from fastapi import UploadFile, HTTPException, status
from app.config import settings
from utils.logger import get_logger

logger = get_logger("storage_service")


class StorageService:
    """
    Manages physical storage of uploaded files on the local filesystem.
    Files are stored in directories partitioned by user ID to guarantee isolation.
    """

    def __init__(self):
        self.base_path = os.path.abspath(settings.STORAGE_PATH)
        os.makedirs(self.base_path, exist_ok=True)
        logger.info("Local storage service initialised at: %s", self.base_path)

    def _get_user_dir(self, user_id: str) -> str:
        user_dir = os.path.join(self.base_path, user_id)
        os.makedirs(user_dir, exist_ok=True)
        return user_dir

    async def save_file(self, user_id: str, file_id: str, file: UploadFile, extension: str) -> str:
        """
        Saves an uploaded file to disk and returns the relative storage path.
        """
        user_dir = self._get_user_dir(user_id)
        # Use file_id as the filename to avoid shell injection or duplicates
        filename = f"{file_id}{extension}"
        dest_path = os.path.join(user_dir, filename)

        try:
            # Read file in chunks and write async
            async with aiofiles.open(dest_path, "wb") as out_file:
                while content := await file.read(1024 * 1024):  # 1MB chunks
                    await out_file.write(content)
            
            # Reset file pointer for subsequent reads if needed
            await file.seek(0)
            
            # Return path relative to base STORAGE_PATH
            relative_path = os.path.join(user_id, filename)
            logger.info("File saved successfully to storage: %s", relative_path)
            return relative_path
        except Exception as e:
            logger.error("Failed to save file for user_id=%s: %s", user_id, e)
            if os.path.exists(dest_path):
                os.remove(dest_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to write file to local disk: {str(e)}",
            )

    def get_absolute_path(self, relative_path: str) -> str:
        """Returns the absolute file path on disk."""
        return os.path.abspath(os.path.join(self.base_path, relative_path))

    def delete_file(self, relative_path: str) -> bool:
        """
        Deletes a file from the filesystem.
        """
        abs_path = self.get_absolute_path(relative_path)
        try:
            if os.path.exists(abs_path):
                os.remove(abs_path)
                logger.info("File deleted from storage: %s", relative_path)
                return True
            logger.warning("Attempted to delete non-existent file: %s", relative_path)
            return False
        except Exception as e:
            logger.error("Failed to delete file from storage: %s, error: %s", relative_path, e)
            return False


storage_service = StorageService()
