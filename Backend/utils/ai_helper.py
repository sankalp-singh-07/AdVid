import base64
import io
import os
import time
import tempfile
import logging
from PIL import Image, ImageDraw, ImageFilter, ImageOps
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


def _target_size_for_aspect_ratio(aspect_ratio: str | None) -> tuple[int, int]:
    if aspect_ratio == "9:16":
        return 1080, 1920
    return 1600, 900


def _cover_image(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = image.convert("RGBA")
    background = Image.new("RGBA", image.size, (244, 245, 247, 255))
    background.alpha_composite(image)
    return ImageOps.fit(
        background.convert("RGB"),
        size,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.38),
    )


def _contain_image(image: Image.Image, max_size: tuple[int, int]) -> Image.Image:
    contained = image.convert("RGBA")
    contained.thumbnail(max_size, Image.Resampling.LANCZOS)
    return contained


def _generate_local_context_image(
    person_image_bytes: bytes,
    product_image_bytes: bytes,
    *,
    product_name: str | None = None,
    aspect_ratio: str | None = None,
) -> bytes:
    """
    Local non-AI fallback for development/quota failures.

    It creates one usable ad-style image by using the model/person photo as the
    background and placing the product as a foreground object with a soft shadow.
    """
    canvas_size = _target_size_for_aspect_ratio(aspect_ratio)
    person_image = _load_reference_image(person_image_bytes)
    product_image = _load_reference_image(product_image_bytes)

    canvas = _cover_image(person_image, canvas_size).convert("RGBA")
    overlay = Image.new("RGBA", canvas_size, (0, 0, 0, 0))

    max_product_size = (
        int(canvas_size[0] * (0.42 if aspect_ratio == "9:16" else 0.20)),
        int(canvas_size[1] * 0.30),
    )
    product = _contain_image(product_image, max_product_size)

    margin_x = int(canvas_size[0] * 0.08)
    if aspect_ratio == "9:16":
        x = int(canvas_size[0] * 0.50)
        y = int(canvas_size[1] * 0.58)
    else:
        x = int(canvas_size[0] * 0.62)
        y = int(canvas_size[1] * 0.55)

    shadow = Image.new("RGBA", product.size, (0, 0, 0, 0))
    shadow_mask = product.getchannel("A")
    shadow.putalpha(shadow_mask)
    shadow = ImageOps.colorize(shadow.getchannel("A"), black=(0, 0, 0), white=(0, 0, 0)).convert("RGBA")
    shadow.putalpha(shadow_mask.point(lambda value: int(value * 0.34)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    overlay.alpha_composite(shadow, (x + 18, y + 22))
    overlay.alpha_composite(product, (x, y))

    combined = Image.alpha_composite(canvas, overlay)

    gradient = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(gradient)
    for row in range(canvas_size[1]):
        opacity = int(130 * max(0, (row - canvas_size[1] * 0.62) / (canvas_size[1] * 0.38)))
        draw.line([(0, row), (canvas_size[0], row)], fill=(0, 0, 0, opacity))
    combined = Image.alpha_composite(combined, gradient)

    output = io.BytesIO()
    combined.convert("RGB").save(output, format="JPEG", quality=92)
    return output.getvalue()


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


def _generate_local_video_from_image(
    image_bytes: bytes,
    aspect_ratio: str | None = None,
) -> bytes:
    """Create a short MP4 from the project image for free/local fallback mode."""
    try:
        import imageio.v2 as imageio
        import numpy as np
    except ImportError as exc:
        raise RuntimeError(
            "Local video fallback requires imageio, imageio-ffmpeg, and numpy."
        ) from exc

    target_size = (720, 1280) if aspect_ratio == "9:16" else (1280, 720)
    source = _cover_image(_load_reference_image(image_bytes), target_size)

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_file:
            tmp_path = tmp_file.name

        fps = 12
        frame_count = 48
        writer = imageio.get_writer(
            tmp_path,
            fps=fps,
            codec="libx264",
            quality=8,
            macro_block_size=16,
        )

        try:
            for index in range(frame_count):
                progress = index / max(frame_count - 1, 1)
                zoom = 1.0 + (progress * 0.08)
                crop_width = int(target_size[0] / zoom)
                crop_height = int(target_size[1] / zoom)
                left = int((target_size[0] - crop_width) * (0.50 + progress * 0.10))
                top = int((target_size[1] - crop_height) * 0.50)
                frame = source.crop(
                    (left, top, left + crop_width, top + crop_height)
                ).resize(target_size, Image.Resampling.LANCZOS)
                writer.append_data(np.asarray(frame))
        finally:
            writer.close()

        with open(tmp_path, "rb") as video_file:
            return video_file.read()
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


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
        logger.warning("google-genai is unavailable. Using local image fallback.")
        return _generate_local_context_image(
            person_image_bytes,
            product_image_bytes,
            product_name=product_name,
            aspect_ratio=aspect_ratio,
        )

    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not configured. Using local image fallback.")
        return _generate_local_context_image(
            person_image_bytes,
            product_image_bytes,
            product_name=product_name,
            aspect_ratio=aspect_ratio,
        )

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
        logger.error(
            "Error during Gemini image generation: %s. Using local image fallback.",
            provider_error,
        )
        if provider_status == 503:
            return _generate_local_context_image(
                person_image_bytes,
                product_image_bytes,
                product_name=product_name,
                aspect_ratio=aspect_ratio,
            )
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
        logger.info("google-genai not available. Returning local image video.")
        return _generate_local_video_from_image(image_bytes, aspect_ratio)

    if not settings.GEMINI_API_KEY:
        logger.info("GEMINI_API_KEY not configured. Returning local image video.")
        return _generate_local_video_from_image(image_bytes, aspect_ratio)

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
        logger.error(
            "Error during Veo video generation: %s. Returning local image video.",
            exc,
        )

    return _generate_local_video_from_image(image_bytes, aspect_ratio)
