import random

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from models.user_model import User
from schemas.user_schema import (
    ResetPasswordRequest,
    UserLogin,
    UserRegister,
    VerifyResetCodeRequest,
)
from utils.helpers import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_access_token,
    verify_password,
    verify_refresh_token,
)

security_scheme = HTTPBearer()


async def _get_user_by(db: AsyncSession, **kwargs) -> User | None:
    result = await db.execute(select(User).filter_by(**kwargs))
    return result.scalars().first()


async def _build_token_response(user: User, message: str) -> tuple[dict, str]:
    token_data = {"sub": str(user.id), "email": user.email}
    refresh_token = await create_refresh_token(data=token_data)
    response_data = {
        "access_token": await create_access_token(data=token_data),
        "token_type": "bearer",
        "message": message,
        "user": user,
    }
    return response_data, refresh_token


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = await verify_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token: missing subject claim.",
        )

    user = await _get_user_by(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authenticated user no longer exists.",
        )
    return user


async def create_user(
    user_data: UserRegister, db: AsyncSession
) -> tuple[dict, str]:
    if await _get_user_by(db, email=user_data.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        name=user_data.name,
        email=user_data.email,
        mobile=user_data.mobile,
        dob=user_data.dob,
        password=await hash_password(user_data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return await _build_token_response(user, "Account created successfully.")


async def login_user(
    user_login: UserLogin, db: AsyncSession
) -> tuple[dict, str]:
    user = await _get_user_by(db, email=user_login.email)
    if not user or not await verify_password(
        user_login.password, user.password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    return await _build_token_response(user, "Logged in successfully.")


async def refresh_access_token(refresh_token: str, db: AsyncSession) -> dict:
    payload = await verify_refresh_token(refresh_token)
    user = await _get_user_by(db, id=payload.get("sub"))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    token_data = {"sub": str(user.id), "email": user.email}
    return {
        "access_token": await create_access_token(data=token_data),
        "token_type": "bearer",
    }


async def send_reset_code(email: EmailStr, db: AsyncSession) -> dict:
    user = await _get_user_by(db, email=email)
    if not user:
        return {
            "message": "If this email is registered, "
            "a reset code has been sent."
        }

    code = f"{random.randint(100_000, 999_999)}"
    user.reset_code = code
    db.add(user)
    await db.commit()

    # TODO: send `code` via email; returning it here is for development only.
    return {"message": "Reset code generated.", "reset_code_for_testing": code}


async def verify_reset_code(
    verify_data: VerifyResetCodeRequest, db: AsyncSession
) -> dict:
    user = await _get_user_by(db, email=verify_data.email)
    if not user or user.reset_code != verify_data.reset_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code.",
        )
    return {"message": "Reset code verified successfully."}


async def reset_password(
    reset_data: ResetPasswordRequest, db: AsyncSession
) -> dict:
    user = await _get_user_by(db, email=reset_data.email)
    if not user or user.reset_code != reset_data.reset_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset transaction. "
            "Please restart the password reset flow.",
        )

    user.password = await hash_password(reset_data.new_password)
    user.reset_code = None
    db.add(user)
    await db.commit()
    return {"message": "Password updated successfully. You can now log in."}
