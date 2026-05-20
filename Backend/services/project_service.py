from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.project_model import Project
from models.user_model import User
from schemas.project_schema import ProjectCreate


async def get_user_credits(user: User) -> dict:
    """Return the credit balance of the authenticated user."""
    return {"credits": user.credits}


async def get_user_projects(user: User, db: AsyncSession) -> dict:
    """
    Return all projects belonging to the authenticated user –
    both published and unpublished.
    """
    result = await db.execute(
        select(Project)
        .where(Project.user_id == user.id)
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    return {"projects": projects, "total": len(projects)}


async def get_project_by_id(
    project_id: str, user: User, db: AsyncSession
) -> Project:
    """
    Return a single project by ID.
    - Owner can always view their project.
    - Other authenticated users can only view published projects.
    """
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalars().first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    if project.user_id != user.id and not project.is_published:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this project.",
        )

    return project


async def create_project(
    project_data: ProjectCreate, user: User, db: AsyncSession
) -> Project:
    """Create a new project owned by the authenticated user."""
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
    return project


async def toggle_project_visibility(
    project_id: str, user: User, db: AsyncSession
) -> Project:
    """
    Toggle a project between published and unpublished.
    Only the owner may change visibility.
    """
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalars().first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    if project.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this project.",
        )

    project.is_published = not project.is_published
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project
