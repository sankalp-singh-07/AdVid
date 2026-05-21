from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from models.user_model import User
from schemas.user_schema import (
    AccessTokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    VerifyResetCodeRequest,
)
from services.auth_service import (
    create_user,
    get_current_user,
    login_user,
    refresh_access_token,
    reset_password,
    send_reset_code,
    verify_reset_code,
)

router = APIRouter(prefix="/auth", tags=["auth"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def set_refresh_token_cookie(response: Response, refresh_token: str):
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=10080 * 60,  # 7 days in seconds
    )


@router.post("/register", status_code=201, response_model=TokenResponse)
async def register(user: UserRegister, response: Response, db: DbDep):
    response_data, refresh_token = await create_user(user_data=user, db=db)
    set_refresh_token_cookie(response, refresh_token)
    return response_data


@router.post("/login", status_code=200, response_model=TokenResponse)
async def login(user: UserLogin, response: Response, db: DbDep):
    response_data, refresh_token = await login_user(user_login=user, db=db)
    set_refresh_token_cookie(response, refresh_token)
    return response_data


@router.get("/me", status_code=200, response_model=UserResponse)
async def me(current_user: CurrentUser):
    return current_user


@router.post("/refresh", status_code=200, response_model=AccessTokenResponse)
async def refresh(db: DbDep, refresh_token: str | None = Cookie(default=None)):
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )
    return await refresh_access_token(refresh_token=refresh_token, db=db)


@router.post("/logout", status_code=200)
async def logout(response: Response, current_user: CurrentUser):
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=True,
        samesite="lax",
    )
    return {"message": "Logged out successfully"}


@router.post("/forgot-password", status_code=200)
async def forgot_password(request: ForgotPasswordRequest, db: DbDep):
    return await send_reset_code(email=request.email, db=db)


@router.post("/verify-reset-code", status_code=200)
async def verify_code(request: VerifyResetCodeRequest, db: DbDep):
    return await verify_reset_code(verify_data=request, db=db)


@router.post("/reset-password", status_code=200)
async def reset_pass(request: ResetPasswordRequest, db: DbDep):
    return await reset_password(reset_data=request, db=db)
