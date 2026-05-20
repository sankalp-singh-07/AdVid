from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from models.project_model import Project
from models.user_model import User
from schemas.project_schema import ProjectCreate
from utils.logger import get_logger

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
    project_data: ProjectCreate, user: User, db: AsyncSession
) -> Project:
    """Create a new project owned by the authenticated user."""
    try:
        logger.debug("Creating project '%s' for user_id=%s", project_data.name, user.id)
        project = Project(
            name=project_data.name,
            user_id=user.id,
            aspect_ratio=project_data.aspect_ratio,
            user_prompt=project_data.user_prompt,
            product_name=project_data.product_name,
            product_description=project_data.product_description,
            target_length=project_data.target_length,
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
        logger.info("Created project_id=%s for user_id=%s", project.id, user.id)
        return project
    except SQLAlchemyError as exc:
        logger.error(
            "DB error creating project for user_id=%s — %s", user.id, exc
        )
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
