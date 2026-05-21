from fastapi import HTTPException, status
import httpx
from sqlalchemy import select, func

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from models.project_model import Project
from models.user_model import User
from schemas.project_schema import ProjectCreate
from utils.logger import get_logger
from utils.cloudinary_helper import (
    upload_to_cloudinary,
    delete_from_cloudinary,
    combine_images_horizontally,
    extract_public_id_from_url,
)
from utils.ai_helper import (
    generate_combined_image,
    generate_video_from_image,
)


logger = get_logger("project_service")



async def get_user_credits(user: User) -> dict:
    """Return the credit balance of the authenticated user."""
    logger.debug("Fetching credits for user_id=%s", user.id)
    return {"credits": user.credits}


async def get_user_projects(user: User, db: AsyncSession) -> dict:
    """
    Return all projects belonging to the authenticated user –
    both published and unpublished.
    """
    try:
        logger.debug("Listing projects for user_id=%s", user.id)
        result = await db.execute(
            select(Project)
            .where(Project.user_id == user.id)
            .order_by(Project.created_at.desc())
        )
        projects = result.scalars().all()
        logger.info("Found %d projects for user_id=%s", len(projects), user.id)
        return {"projects": projects, "total": len(projects)}
    except SQLAlchemyError as exc:
        logger.error("DB error listing projects for user_id=%s — %s", user.id, exc)
        raise


async def get_project_by_id(
    project_id: str, user: User, db: AsyncSession
) -> Project:
    """
    Return a single project by ID.
    - Owner can always view their project.
    - Other authenticated users can only view published projects.
    """
    try:
        logger.debug("Fetching project_id=%s for user_id=%s", project_id, user.id)
        result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalars().first()
    except SQLAlchemyError as exc:
        logger.error("DB error fetching project_id=%s — %s", project_id, exc)
        raise

    if not project:
        logger.warning("Project not found: project_id=%s", project_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    if project.user_id != user.id and not project.is_published:
        logger.warning(
            "Forbidden: user_id=%s tried to access private project_id=%s",
            user.id,
            project_id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this project.",
        )

    return project


async def create_project(
    project_data: ProjectCreate,
    image1_bytes: bytes,
    image1_name: str,
    image2_bytes: bytes,
    image2_name: str,
    user: User,
    db: AsyncSession
) -> Project:
    """
    Create a new project. Combines the two uploaded images using Gemini,
    uploads them to Cloudinary, and deducts 5 credits.
    """
    # 1. Credit check
    if user.credits < 5:
        logger.warning("User user_id=%s has insufficient credits=%s for project creation", user.id, user.credits)
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits. Creating a project requires 5 credits for image combination."
        )

    # 2. Combine the images
    logger.info("Combining images during project creation...")
    try:
        combined_bytes = generate_combined_image(image1_bytes, image2_bytes)
    except Exception as exc:
        logger.error("Failed to combine images: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to combine the uploaded images: {str(exc)}"
        )

    # 3. Upload to Cloudinary
    logger.info("Uploading images to Cloudinary...")
    try:
        up1 = await upload_to_cloudinary(image1_bytes, image1_name, resource_type="image")
        up2 = await upload_to_cloudinary(image2_bytes, image2_name, resource_type="image")
        up_comb = await upload_to_cloudinary(combined_bytes, "combined.jpg", resource_type="image")
    except Exception as exc:
        logger.error("Cloudinary upload failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to upload images to Cloudinary: {str(exc)}"
        )

    # 4. Save project in DB and deduct credits
    try:
        project = Project(
            name=project_data.name,
            user_id=user.id,
            aspect_ratio=project_data.aspect_ratio,
            user_prompt=project_data.user_prompt,
            product_name=project_data.product_name,
            product_description=project_data.product_description,
            target_length=project_data.target_length,
            image_url_1=up1["secure_url"],
            image_url_2=up2["secure_url"],
            combined_image_url=up_comb["secure_url"],
            is_generating_image=False,
            is_generating_video=False
        )
        
        user.credits -= 5
        db.add(project)
        db.add(user)
        await db.commit()
        await db.refresh(project)
        await db.refresh(user)
        logger.info("Created project_id=%s for user_id=%s. 5 credits deducted.", project.id, user.id)
        return project
    except SQLAlchemyError as exc:
        logger.error("DB error creating project/deducting credits for user_id=%s — %s", user.id, exc)
        raise


async def toggle_project_visibility(
    project_id: str, user: User, db: AsyncSession
) -> Project:
    """
    Toggle a project between published and unpublished.
    Only the owner may change visibility.
    """
    try:
        logger.debug(
            "Toggling visibility for project_id=%s by user_id=%s", project_id, user.id
        )
        result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalars().first()
    except SQLAlchemyError as exc:
        logger.error(
            "DB error fetching project_id=%s for visibility toggle — %s", project_id, exc
        )
        raise

    if not project:
        logger.warning("Project not found for toggle: project_id=%s", project_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    if project.user_id != user.id:
        logger.warning(
            "Forbidden: user_id=%s tried to toggle visibility of project_id=%s",
            user.id,
            project_id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this project.",
        )

    try:
        project.is_published = not project.is_published
        db.add(project)
        await db.commit()
        await db.refresh(project)
        logger.info(
            "project_id=%s is_published=%s by user_id=%s",
            project_id,
            project.is_published,
            user.id,
        )
        return project
    except SQLAlchemyError as exc:
        logger.error(
            "DB error toggling visibility for project_id=%s — %s", project_id, exc
        )
        raise


async def delete_project(project_id: str, user: User, db: AsyncSession) -> bool:
    """
    Delete a project and clean up its associated Cloudinary assets.
    Only the owner may delete the project.
    """
    try:
        logger.debug("Deleting project_id=%s by user_id=%s", project_id, user.id)
        result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalars().first()
    except SQLAlchemyError as exc:
        logger.error("DB error fetching project_id=%s for deletion — %s", project_id, exc)
        raise

    if not project:
        logger.warning("Project not found for deletion: project_id=%s", project_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    if project.user_id != user.id:
        logger.warning(
            "Forbidden: user_id=%s tried to delete project_id=%s owned by %s",
            user.id,
            project_id,
            project.user_id
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this project.",
        )

    # 1. Clean up Cloudinary assets
    urls_to_delete = [
        (project.image_url_1, "image"),
        (project.image_url_2, "image"),
        (project.combined_image_url, "image"),
        (project.video_url, "video"),
    ]

    for url, res_type in urls_to_delete:
        if url:
            public_id = extract_public_id_from_url(url)
            if public_id:
                logger.info("Scheduling deletion of Cloudinary asset public_id=%s (%s)", public_id, res_type)
                await delete_from_cloudinary(public_id, resource_type=res_type)

    # 2. Delete from database
    try:
        await db.delete(project)
        await db.commit()
        logger.info("Deleted project_id=%s from DB successfully.", project_id)
        return True
    except SQLAlchemyError as exc:
        logger.error("DB error deleting project_id=%s — %s", project_id, exc)
        raise


async def create_video(
    project_id: str,
    combined_image_url: str,
    user: User,
    db: AsyncSession
) -> Project:
    """
    Accepts combined_image_url, downloads it,
    generates a video showcase using Veo, uploads video to Cloudinary,
    and deducts 10 credits from the user's account.
    """
    # 1. Check credits (Requires 10 credits)
    if user.credits < 10:
        logger.warning("User user_id=%s has insufficient credits=%s (need 10)", user.id, user.credits)
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits. Generating a video requires 10 credits."
        )

    # 2. Fetch the project
    try:
        result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalars().first()
    except SQLAlchemyError as exc:
        logger.error("DB error fetching project_id=%s for video generation — %s", project_id, exc)
        raise

    if not project:
        logger.warning("Project not found for video generation: project_id=%s", project_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    if project.user_id != user.id:
        logger.warning(
            "Forbidden: user_id=%s tried to generate video for project_id=%s",
            user.id,
            project_id
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this project.",
        )

    logger.info("Starting video generation for project_id=%s. Credits before=%d", project_id, user.credits)

    # Set status flag to True at the start and commit so polling client can see it
    try:
        project.is_generating_video = True
        db.add(project)
        await db.commit()
        await db.refresh(project)
    except SQLAlchemyError as exc:
        logger.error("DB error setting project generation status — %s", exc)
        raise

    try:
        # 3. Download combined image bytes from combined_image_url using httpx
        logger.info("Downloading combined image from url: %s", combined_image_url)
        async with httpx.AsyncClient() as client:
            response = await client.get(combined_image_url)
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to fetch combined image from provided URL: {combined_image_url}"
                )
            combined_bytes = response.content

        # 4. Generate video from the combined image using Veo
        logger.info("Generating video showcase via Veo...")
        video_bytes = generate_video_from_image(
            image_bytes=combined_bytes,
            product_name=project.product_name or "",
            product_description=project.product_description or "",
            aspect_ratio=project.aspect_ratio
        )

        logger.info("Uploading generated video to Cloudinary for project_id=%s...", project_id)
        video_upload = await upload_to_cloudinary(video_bytes, "video_ad.mp4", resource_type="video")

        # 5. Update database record and deduct 10 credits
        project.video_url = video_upload["secure_url"]
        project.is_generating_video = False

        user.credits -= 10
        db.add(project)
        db.add(user)
        
        await db.commit()
        await db.refresh(project)
        await db.refresh(user)

        logger.info(
            "Video generation succeeded for project_id=%s. Credits remaining=%d. Video URL=%s",
            project_id,
            user.credits,
            project.video_url
        )
        return project

    except Exception as exc:
        logger.error("Error during video generation process for project_id=%s: %s", project_id, exc)
        # Reset generation flag to False on failure so the UI doesn't hang in generating state
        try:
            project.is_generating_video = False
            db.add(project)
            await db.commit()
        except Exception as db_exc:
            logger.error("Failed to reset project generation flags on error: %s", db_exc)
        raise







async def get_public_projects(db: AsyncSession, skip: int = 0, limit: int = 10) -> dict:
    """
    Retrieve all published projects from all users.
    Ordered by creation date descending.
    """
    try:
        logger.debug("Listing all public projects (skip=%d, limit=%d)", skip, limit)
        
        # Get total count of public projects
        count_result = await db.execute(
            select(func.count()).select_from(Project).where(Project.is_published == True)
        )
        total = count_result.scalar() or 0
        
        # Get public projects
        result = await db.execute(
            select(Project)
            .where(Project.is_published == True)
            .order_by(Project.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        projects = result.scalars().all()
        
        logger.info("Found %d public projects total.", len(projects))
        return {"projects": projects, "total": total}
    except SQLAlchemyError as exc:
        logger.error("DB error listing public projects — %s", exc)
        raise

