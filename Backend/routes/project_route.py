from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from models.user_model import User
from schemas.project_schema import (
    CreditsResponse,
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
)
from services.auth_service import get_current_user
from services.project_service import (
    create_project,
    get_project_by_id,
    get_user_credits,
    get_user_projects,
    toggle_project_visibility,
)

router = APIRouter(prefix="/projects", tags=["projects"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

@router.get("/credits", status_code=200, response_model=CreditsResponse)
async def get_credits(current_user: CurrentUser):
    return await get_user_credits(current_user)


@router.post("", status_code=201, response_model=ProjectResponse)
async def create(project_data: ProjectCreate, current_user: CurrentUser, db: DbDep):
    return await create_project(project_data=project_data, user=current_user, db=db)


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
