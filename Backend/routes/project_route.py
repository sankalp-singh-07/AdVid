from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from models.user_model import User
from schemas.project_schema import (
    CreditsResponse,
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
    VideoGenerateRequest,
)
from services.auth_service import get_current_user
from services.project_service import (
    create_project,
    get_project_by_id,
    get_user_credits,
    get_user_projects,
    toggle_project_visibility,
    delete_project,
    create_video,
    get_public_projects,
)


router = APIRouter(prefix="/projects", tags=["projects"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

@router.get("/credits", status_code=200, response_model=CreditsResponse)
async def get_credits(current_user: CurrentUser):
    return await get_user_credits(current_user)


@router.post("", status_code=201, response_model=ProjectResponse)
async def create(
    name: str = Form(...),
    aspect_ratio: str | None = Form(None),
    user_prompt: str | None = Form(None),
    product_name: str | None = Form(None),
    product_description: str | None = Form(None),
    target_length: int | None = Form(None),
    image1: UploadFile = File(...),
    image2: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
    db: DbDep = Depends(get_db)
):
    project_data = ProjectCreate(
        name=name,
        aspect_ratio=aspect_ratio,
        user_prompt=user_prompt,
        product_name=product_name,
        product_description=product_description,
        target_length=target_length
    )
    image1_bytes = await image1.read()
    image2_bytes = await image2.read()
    return await create_project(
        project_data=project_data,
        image1_bytes=image1_bytes,
        image1_name=image1.filename,
        image2_bytes=image2_bytes,
        image2_name=image2.filename,
        user=current_user,
        db=db
    )


@router.get("", status_code=200, response_model=ProjectListResponse)
async def list_projects(current_user: CurrentUser, db: DbDep):
    return await get_user_projects(user=current_user, db=db)


@router.get("/{project_id}", status_code=200, response_model=ProjectResponse)
async def get_project(project_id: str, current_user: CurrentUser, db: DbDep):
    return await get_project_by_id(project_id=project_id, user=current_user, db=db)


@router.patch("/{project_id}/visibility", status_code=200, response_model=ProjectResponse)
async def toggle_visibility(project_id: str, current_user: CurrentUser, db: DbDep):
    return await toggle_project_visibility(
        project_id=project_id, user=current_user, db=db
    )


@router.get("/public", status_code=200, response_model=ProjectListResponse)
async def list_public_projects(db: DbDep, skip: int = 0, limit: int = 10, current_user: CurrentUser = Depends(get_current_user)):
    """Retrieve all published projects from all users."""
    return await get_public_projects(db=db, skip=skip, limit=limit)


@router.delete("/{project_id}", status_code=200)
async def delete(project_id: str, current_user: CurrentUser, db: DbDep):
    """Delete a project and its associated Cloudinary assets."""
    await delete_project(project_id=project_id, user=current_user, db=db)
    return {"message": "Project deleted successfully."}


@router.post("/{project_id}/generate-video", status_code=200, response_model=ProjectResponse)
async def generate_video(
    project_id: str,
    request_data: VideoGenerateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: DbDep = Depends(get_db)
):
    """
    Accepts a combined image URL, downloads the image,
    generates a video showcase using Veo, and deducts 10 credits.
    """
    return await create_video(
        project_id=project_id,
        combined_image_url=request_data.combined_image_url,
        user=current_user,
        db=db
    )

