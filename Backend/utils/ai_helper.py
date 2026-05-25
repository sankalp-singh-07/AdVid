import base64
import io
import time
import tempfile
import logging
from PIL import Image
from app.config import settings

logger = logging.getLogger("ai_helper")

is_genai_available = False
try:
    from google import genai
    from google.genai import types
    is_genai_available = True
    logger.info("google-genai SDK imported successfully.")
except ImportError:
    logger.warning("google-genai library is not installed. Please install it using requirements.txt. Running in mock/fallback mode.")


class ImageGenerationError(RuntimeError):
    """Raised when an in-context product image cannot be generated."""

    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.status_code = status_code


def _load_reference_image(image_bytes: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(image_bytes))
    image.load()
    return image


def _extract_generated_image_bytes(response) -> bytes | None:
    parts = getattr(response, "parts", None)
    if not parts and getattr(response, "candidates", None):
        content = getattr(response.candidates[0], "content", None)
        parts = getattr(content, "parts", None) if content else None

    for part in parts or []:
        as_image = getattr(part, "as_image", None)
        if callable(as_image):
            image = as_image()
            if image is not None:
                output = io.BytesIO()
                image.convert("RGB").save(output, format="JPEG", quality=94)
                return output.getvalue()

        inline_data = getattr(part, "inline_data", None)
        if inline_data is not None and getattr(inline_data, "data", None):
            data = inline_data.data
            if isinstance(data, str):
                return base64.b64decode(data)
            return data

    return None


def _format_provider_error(exc: Exception) -> tuple[str, int]:
    message = str(exc)
    status_code = getattr(exc, "status_code", None)

    if status_code == 429 or "RESOURCE_EXHAUSTED" in message:
        return ((
            f"Gemini quota was exhausted for model {settings.GEMINI_IMAGE_MODEL}. "
            "Try again later, use a billed API key, or choose another available image model."
        ), 503)

    if status_code in {401, 403} or "API_KEY" in message or "PERMISSION_DENIED" in message:
        return (
            "Gemini rejected the API key or the project does not have access to the selected image model.",
            503,
        )

    first_line = message.splitlines()[0] if message else exc.__class__.__name__
    return first_line[:300], 422


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


def generate_combined_image(
    person_image_bytes: bytes,
    product_image_bytes: bytes,
    *,
    product_name: str | None = None,
    product_description: str | None = None,
    user_prompt: str | None = None,
    aspect_ratio: str | None = None,
) -> bytes:
    """
    Generates one realistic in-context ad image from a person image and a product image.
    """
    if not is_genai_available:
        raise ImageGenerationError("google-genai is not installed.", status_code=503)

    if not settings.GEMINI_API_KEY:
        raise ImageGenerationError("GEMINI_API_KEY is not configured.", status_code=503)

    try:
        logger.info(
            "Generating in-context product image via Gemini model: %s",
            settings.GEMINI_IMAGE_MODEL,
        )
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        person_image = _load_reference_image(person_image_bytes)
        product_image = _load_reference_image(product_image_bytes)

        prompt_parts = [
            "Create a single photorealistic ecommerce ad image using the first image as the person reference and the second image as the product reference.",
            "The final image must not be a collage, split-screen, side-by-side layout, product cutout board, or before/after comparison.",
            "Keep the person's face and identity recognizable. Integrate the product naturally into the scene.",
            "If the product is a cup, mug, bottle, can, or handheld item, show the person naturally holding it with realistic hands, contact, shadows, scale, and perspective.",
            "Match lighting and color so it looks like one real photo, not two pasted images.",
            "Use clean professional ad photography with no extra text, watermark, logo hallucinations, borders, or UI.",
        ]

        if product_name:
            prompt_parts.append(f"Product name/context: {product_name}.")
        if product_description:
            prompt_parts.append(f"Product details: {product_description}.")
        if aspect_ratio:
            prompt_parts.append(f"Compose for aspect ratio {aspect_ratio}.")
        if user_prompt:
            prompt_parts.append(f"Creative direction from user: {user_prompt}.")

        response = client.models.generate_content(
            model=settings.GEMINI_IMAGE_MODEL,
            contents=["\n".join(prompt_parts), person_image, product_image],
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
            ),
        )

        generated_bytes = _extract_generated_image_bytes(response)
        if generated_bytes:
            logger.info("Gemini successfully generated an in-context product image.")
            return generated_bytes

        raise ImageGenerationError("Gemini response did not contain image data.")
    except ImageGenerationError:
        raise
    except Exception as exc:
        provider_error, provider_status = _format_provider_error(exc)
        logger.error("Error during Gemini image generation: %s", provider_error)
        raise ImageGenerationError(provider_error, status_code=provider_status) from exc


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
