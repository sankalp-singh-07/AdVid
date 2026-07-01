import os
import re
import aiofiles
import httpx
import tempfile
import cloudinary
import cloudinary.uploader
import cloudinary.utils
from fastapi import UploadFile, HTTPException, status
from app.config import settings
from utils.logger import get_logger

logger = get_logger("storage_service")


class StorageService:
    """
    Manages storage of uploaded files on Cloudinary.
    Provides methods to save (upload), download transiently for text extraction, and delete.
    """

    def __init__(self):
        if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY:
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True
            )
            logger.info("Cloudinary storage service initialised successfully.")
        else:
            logger.warning("Cloudinary credentials are not configured in settings!")

    def _get_signed_url(self, file_url: str) -> str:
        """
        Extract public_id from a Cloudinary URL and return a fresh signed URL.
        This bypasses any 'Strict Transformations' / restricted delivery settings.
        """
        match = re.search(r"/raw/upload/(?:v\d+/)?([^?#]+)", file_url)
        if not match:
            logger.warning("Could not parse public_id, falling back to original URL: %s", file_url)
            return file_url

        public_id = match.group(1)
        signed_url, _options = cloudinary.utils.cloudinary_url(
            public_id,
            resource_type="raw",
            type="upload",
            sign_url=True,
            secure=True,
        )
        logger.debug("Generated signed URL for public_id=%s", public_id)
        return signed_url

    async def save_file(self, user_id: str, file_id: str, file: UploadFile, extension: str) -> dict:
        """
        Uploads an uploaded file to Cloudinary and returns a dict with url and size in bytes.
        """
        import anyio
        try:
            content = await file.read()
            # Reset file pointer for subsequent reads
            await file.seek(0)
            
            # Omit extension to avoid Cloudinary raw file extension restrictions (e.g. PDF block)
            public_id = file_id
            
            def upload_sync():
                return cloudinary.uploader.upload(
                    content,
                    public_id=public_id,
                    resource_type="raw",
                    type="upload",
                )
                
            result = await anyio.to_thread.run_sync(upload_sync)
            logger.info("File uploaded successfully to Cloudinary: %s", result["secure_url"])
            return {
                "url": result["secure_url"],
                "size": result.get("bytes", 0)
            }
        except Exception as e:
            logger.error("Failed to save file to Cloudinary: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to write file to Cloudinary: {str(e)}",
            )

    async def download_temp_file(self, file_url: str, extension: str = ".tmp") -> str:
        """
        Downloads a file from Cloudinary to a temporary local file,
        and returns its absolute path. The caller is responsible for deleting this file.
        """
        # Create temp directory in the workspace to hold parsing targets transiently
        temp_dir = os.path.abspath("./temp_uploads")
        os.makedirs(temp_dir, exist_ok=True)
        
        fd, temp_path = tempfile.mkstemp(suffix=extension, dir=temp_dir)
        os.close(fd)
        
        # Use a signed URL to bypass any Cloudinary delivery restrictions
        download_url = self._get_signed_url(file_url)
        logger.info("Downloading file from Cloudinary (signed) to transient path: %s", temp_path)
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("GET", download_url) as response:
                    if response.status_code != 200:
                        raise Exception(f"Failed to download file, HTTP status: {response.status_code}")
                    async with aiofiles.open(temp_path, "wb") as out_file:
                        async for chunk in response.aiter_bytes(chunk_size=1024 * 1024):
                            await out_file.write(chunk)
            return temp_path
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            logger.error("Failed to download temp file from %s: %s", file_url, e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch document for processing: {str(e)}",
            )

    def delete_file(self, file_url: str) -> bool:
        """
        Deletes a file from Cloudinary using its URL.
        """
        try:
            match = re.search(r"/raw/upload/(?:v\d+/)?([^?#]+)", file_url)
            if not match:
                logger.warning("Could not parse Cloudinary public ID from URL: %s", file_url)
                return False
                
            public_id = match.group(1)
            logger.info("Deleting public_id=%s from Cloudinary", public_id)
            
            res = cloudinary.uploader.destroy(public_id, resource_type="raw")
            logger.info("Cloudinary delete result for %s: %s", public_id, res)
            return res.get("result") == "ok"
        except Exception as e:
            logger.error("Failed to delete file from Cloudinary: %s, error: %s", file_url, e)
            return False


storage_service = StorageService()

