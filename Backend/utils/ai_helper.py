import io
import time
import tempfile
import logging
from app.config import settings
from utils.cloudinary_helper import combine_images_horizontally

logger = logging.getLogger("ai_helper")

is_genai_available = False
try:
    from google import genai
    from google.genai import types
    is_genai_available = True
    logger.info("google-genai SDK imported successfully.")
except ImportError:
    logger.warning("google-genai library is not installed. Please install it using requirements.txt. Running in mock/fallback mode.")


def _get_mock_video_bytes() -> bytes:
    """Helper to fetch a tiny valid sample MP4 from Cloudinary to use in fallbacks."""
    try:
        import httpx
        url = "https://res.cloudinary.com/demo/video/upload/dog.mp4"
        logger.info("Fetching mock video bytes from: %s", url)
        with httpx.Client() as client:
            resp = client.get(url, timeout=10.0)
            if resp.status_code == 200:
                logger.info("Mock video bytes retrieved successfully.")
                return resp.content
    except Exception as e:
        logger.error("Failed to fetch mock video bytes online: %s", e)
    
    # Tiny fallback byte sequence representing a basic placeholder
    return b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom\x00\x00\x00\x08free\x00\x00\x00\x08mdat'


def generate_combined_image(image1_bytes: bytes, image2_bytes: bytes) -> bytes:
    """
    Combines person and product images using Gemini 3.0 image generation capabilities.
    If Gemini API key is missing or the call fails, falls back to Pillow-based horizontal stitching.
    """
    if not is_genai_available:
        logger.info("google-genai not available. Falling back to Pillow-based image combination.")
        return combine_images_horizontally(image1_bytes, image2_bytes)

    if not settings.GEMINI_API_KEY:
        logger.info("GEMINI_API_KEY not configured. Falling back to Pillow-based image combination.")
        return combine_images_horizontally(image1_bytes, image2_bytes)

    try:
        logger.info("Attempting to combine images via Gemini model: %s", settings.GEMINI_IMAGE_MODEL)
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        part1 = types.Part.from_bytes(data=image1_bytes, mime_type="image/jpeg")
        part2 = types.Part.from_bytes(data=image2_bytes, mime_type="image/jpeg")

        system_instruction = (
            "Combine the person and product into a realistic photo. "
            "Make the person naturally hold or use the product. "
            "Match lighting, shadows, scale and perspective. "
            "Make the person stand in professional studio lighting. "
            "Output ecommerce-quality photo realistic imagery."
        )

        response = client.models.generate_content(
            model=settings.GEMINI_IMAGE_MODEL,
            contents=[system_instruction, part1, part2],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"]
            )
        )

        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if part.inline_data is not None:
                    logger.info("Gemini successfully generated combined image.")
                    return part.inline_data.data

        logger.warning("Gemini response did not contain image data. Falling back to Pillow horizontal stitch.")
    except Exception as exc:
        logger.error("Error during Gemini image combination: %s. Falling back to Pillow horizontal stitch.", exc)

    return combine_images_horizontally(image1_bytes, image2_bytes)


def generate_video_from_image(
    image_bytes: bytes,
    product_name: str,
    product_description: str,
    aspect_ratio: str | None = None
) -> bytes:
    """
    Generates a showcase video from the combined image using Veo.
    Polls the operation until done, then downloads and returns video bytes.
    If API key is missing or call fails, returns fallback mock video bytes.
    """
    if not is_genai_available:
        logger.info("google-genai not available. Returning mock video.")
        return _get_mock_video_bytes()

    if not settings.GEMINI_API_KEY:
        logger.info("GEMINI_API_KEY not configured. Returning mock video.")
        return _get_mock_video_bytes()

    try:
        logger.info("Attempting to generate video via Veo model: %s", settings.GEMINI_VIDEO_MODEL)
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        # Write combined image to temporary file to upload using Files API
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
            tmp_file.write(image_bytes)
            tmp_path = tmp_file.name

        try:
            logger.info("Uploading reference image to Gemini Files API...")
            uploaded_file = client.files.upload(file=tmp_path)
            logger.info("File uploaded successfully. URI: %s", uploaded_file.uri)

            prompt_text = f"make the person showcase the product which is {product_name} {product_description or ''}"
            
            # Map aspect ratio format
            ar = aspect_ratio or "16:9"
            if ar not in ["16:9", "9:16", "1:1", "21:9", "4:3", "3:4"]:
                if "portrait" in ar.lower():
                    ar = "9:16"
                elif "square" in ar.lower():
                    ar = "1:1"
                else:
                    ar = "16:9"

            logger.info("Starting Veo video generation operation with prompt: '%s' and aspect ratio: %s", prompt_text, ar)
            operation = client.models.generate_videos(
                model=settings.GEMINI_VIDEO_MODEL,
                prompt=prompt_text,
                image=types.Image(uri=uploaded_file.uri),
                config=types.GenerateVideosConfig(
                    number_of_videos=1,
                    aspect_ratio=ar,
                )
            )

            # Polling loop (wait up to 10 minutes)
            logger.info("Polling Veo operation: %s", operation.name)
            max_retries = 60
            retry_count = 0
            while not operation.done and retry_count < max_retries:
                time.sleep(10)
                operation = client.operations.get(operation)
                retry_count += 1
                logger.info("Veo status: done=%s", operation.done)

            if not operation.done:
                raise Exception("Veo video generation timed out.")

            if operation.error:
                raise Exception(f"Veo operation failed: {operation.error}")

            if operation.response and operation.response.generated_videos:
                generated_video = operation.response.generated_videos[0]
                logger.info("Veo video generated. Downloading...")
                video_bytes = client.files.download(file=generated_video.video)
                logger.info("Successfully downloaded video bytes.")
                return video_bytes
            else:
                raise Exception("Veo response did not contain generated videos.")
        finally:
            # Clean up local temp file
            import os
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
            
            # Clean up files API asset
            try:
                if 'uploaded_file' in locals():
                    client.files.delete(name=uploaded_file.name)
                    logger.info("Deleted temporary reference image from Gemini Files API.")
            except Exception as e:
                logger.warning("Failed to delete temp file from Gemini files API: %s", e)

    except Exception as exc:
        logger.error("Error during Veo video generation: %s. Returning mock video.", exc)

    return _get_mock_video_bytes()
