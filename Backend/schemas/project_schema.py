from datetime import datetime

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    aspect_ratio: str | None = None
    user_prompt: str | None = None
    product_name: str | None = None
    product_description: str | None = None
    target_length: int | None = Field(None, gt=0, description="Target video length in seconds")


class ProjectResponse(BaseModel):
    id: str
    name: str
    user_id: str
    aspect_ratio: str | None
    user_prompt: str | None
    product_name: str | None
    product_description: str | None
    target_length: int | None
    image_url_1: str | None
    image_url_2: str | None
    combined_image_url: str | None
    video_url: str | None
    is_published: bool
    is_generating_image: bool
    is_generating_video: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int


class CreditsResponse(BaseModel):
    credits: int

