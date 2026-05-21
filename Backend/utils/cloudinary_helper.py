import io
import logging
from PIL import Image
from fastapi import HTTPException, status
from app.config import settings

logger = logging.getLogger("cloudinary_helper")

# Configure Cloudinary if credentials are provided
is_cloudinary_configured = False
try:
    if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True
        )
        is_cloudinary_configured = True
        logger.info("Cloudinary configured successfully.")
    else:
        logger.warning("Cloudinary credentials not set in environment settings. Falling back to mock uploads for development.")
except Exception as exc:
    logger.error("Failed to configure Cloudinary: %s. falling back to mock uploads.", exc)


def combine_images_horizontally(image1_bytes: bytes, image2_bytes: bytes) -> bytes:
    """
    Combines two images horizontally using Pillow.
    Resizes both images to have the same height (minimum of the two heights)
    before placing them side-by-side.
    """
    try:
        img1 = Image.open(io.BytesIO(image1_bytes))
        img2 = Image.open(io.BytesIO(image2_bytes))
        
        # Determine the target height (minimum of both to preserve resolution/avoid massive upscale)
        target_height = min(img1.height, img2.height)
        if target_height < 10:
            target_height = 480 # Fallback for tiny/dummy inputs
            
        # Calculate aspect ratio preserving widths
        img1_width = int(img1.width * (target_height / img1.height))
        img2_width = int(img2.width * (target_height / img2.height))
        
        # Resize images
        img1_resized = img1.resize((img1_width, target_height), Image.Resampling.LANCZOS)
        img2_resized = img2.resize((img2_width, target_height), Image.Resampling.LANCZOS)
        
        # Combine horizontally
        combined_width = img1_width + img2_width
        combined_image = Image.new("RGB", (combined_width, target_height))
        combined_image.paste(img1_resized, (0, 0))
        combined_image.paste(img2_resized, (img1_width, 0))
        
        # Save to bytes
        output = io.BytesIO()
        combined_image.save(output, format="JPEG", quality=90)
        return output.getvalue()
    except Exception as exc:
        logger.error("Error combining images with Pillow: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to combine the uploaded images: {str(exc)}"
        )


async def upload_to_cloudinary(
    file_bytes: bytes, 
    filename: str, 
    resource_type: str = "image", 
    folder: str = "advid"
) -> dict:
    """
    Uploads a file to Cloudinary. 
    If Cloudinary is not configured, returns mock URLs/IDs for development.
    """
    if not is_cloudinary_configured:
        logger.info("Mock upload triggered for filename=%s (resource_type=%s)", filename, resource_type)
        mock_id = f"mock_{filename.replace('.', '_')}"
        if resource_type == "video":
            mock_url = "https://res.cloudinary.com/demo/video/upload/dog.mp4"
        else:
            mock_url = f"https://res.cloudinary.com/demo/image/upload/v12345/sample.jpg"
        return {"secure_url": mock_url, "public_id": mock_id}

    try:
        import cloudinary.uploader
        # Upload using the byte stream
        upload_result = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            resource_type=resource_type
        )
        return {
            "secure_url": upload_result.get("secure_url"),
            "public_id": upload_result.get("public_id")
        }
    except Exception as exc:
        logger.error("Cloudinary upload failed for filename=%s: %s", filename, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to upload asset to Cloudinary: {str(exc)}"
        )


async def delete_from_cloudinary(public_id: str, resource_type: str = "image") -> bool:
    """
    Deletes an asset from Cloudinary by public ID.
    """
    if not public_id or public_id.startswith("mock_"):
        logger.info("Mock deletion for public_id=%s skipped.", public_id)
        return True

    if not is_cloudinary_configured:
        logger.info("Cloudinary not configured. Mock delete for public_id=%s succeeded.", public_id)
        return True

    try:
        import cloudinary.uploader
        result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        success = result.get("result") == "ok"
        if success:
            logger.info("Deleted public_id=%s from Cloudinary", public_id)
        else:
            logger.warning("Failed to delete public_id=%s: Cloudinary returned result=%s", public_id, result.get("result"))
        return success
    except Exception as exc:
        logger.error("Cloudinary deletion failed for public_id=%s: %s", public_id, exc)
        # We don't raise here to avoid blocking project deletion if Cloudinary is temporarily unreachable
        return False


def extract_public_id_from_url(url: str | None) -> str | None:
    """
    Extracts the Cloudinary public ID from a secure URL.
    Returns None if not a Cloudinary URL or invalid format.
    """
    if not url:
        return None
    if "res.cloudinary.com" not in url:
        return None
    try:
        parts = url.split("/upload/")
        if len(parts) < 2:
            return None
        relative_path = parts[1]
        
        # Remove version segment (e.g. "v1234567/") if present
        if relative_path.startswith("v") and "/" in relative_path:
            subparts = relative_path.split("/", 1)
            if subparts[0][1:].isdigit():
                relative_path = subparts[1]
        
        # Strip the file extension
        if "." in relative_path:
            relative_path = relative_path.rsplit(".", 1)[0]
            
        return relative_path
    except Exception as exc:
        logger.error("Failed to parse public ID from URL %s: %s", url, exc)
        return None

