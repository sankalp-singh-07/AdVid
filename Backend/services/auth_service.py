import random

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import EmailStr
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
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
from utils.logger import get_logger

logger = get_logger("auth_service")
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

    try:
        user = await _get_user_by(db, id=user_id)
    except SQLAlchemyError as exc:
        logger.error("DB error fetching current user user_id=%s — %s", user_id, exc)
        raise

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authenticated user no longer exists.",
        )
    return user


async def create_user(
    user_data: UserRegister, db: AsyncSession
) -> tuple[dict, str]:
    try:
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
        logger.info("New user registered: email=%s, user_id=%s", user.email, user.id)
        return await _build_token_response(user, "Account created successfully.")
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.error("DB error creating user email=%s — %s", user_data.email, exc)
        raise


async def login_user(
    user_login: UserLogin, db: AsyncSession
) -> tuple[dict, str]:
    try:
        user = await _get_user_by(db, email=user_login.email)
    except SQLAlchemyError as exc:
        logger.error("DB error during login for email=%s — %s", user_login.email, exc)
        raise

    if not user or not await verify_password(user_login.password, str(user.password)):
        logger.warning("Failed login attempt for email=%s", user_login.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    logger.info("User logged in: email=%s, user_id=%s", user.email, user.id)
    return await _build_token_response(user, "Logged in successfully.")


async def refresh_access_token(refresh_token: str, db: AsyncSession) -> dict:
    payload = await verify_refresh_token(refresh_token)
    try:
        user = await _get_user_by(db, id=payload.get("sub"))
    except SQLAlchemyError as exc:
        logger.error("DB error during token refresh — %s", exc)
        raise

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
    try:
        user = await _get_user_by(db, email=email)
    except SQLAlchemyError as exc:
        logger.error("DB error in send_reset_code for email=%s — %s", email, exc)
        raise

    if not user:
        # Don't leak whether the email exists
        return {
            "message": "If this email is registered, a reset code has been sent."
        }

    try:
        code = f"{random.randint(100_000, 999_999)}"
        user.reset_code = code
        db.add(user)
        await db.commit()
        logger.info("Reset code generated for email=%s", email)
    except SQLAlchemyError as exc:
        logger.error("DB error saving reset code for email=%s — %s", email, exc)
        raise

    # TODO: send `code` via email; returning it here is for development only.
    return {"message": "Reset code generated.", "reset_code_for_testing": code}


async def verify_reset_code(
    verify_data: VerifyResetCodeRequest, db: AsyncSession
) -> dict:
    try:
        user = await _get_user_by(db, email=verify_data.email)
    except SQLAlchemyError as exc:
        logger.error("DB error in verify_reset_code for email=%s — %s", verify_data.email, exc)
        raise

    if not user or user.reset_code != verify_data.reset_code:
        logger.warning("Invalid reset code attempt for email=%s", verify_data.email)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code.",
        )
    return {"message": "Reset code verified successfully."}


async def reset_password(
    reset_data: ResetPasswordRequest, db: AsyncSession
) -> dict:
    try:
        user = await _get_user_by(db, email=reset_data.email)
    except SQLAlchemyError as exc:
        logger.error("DB error in reset_password for email=%s — %s", reset_data.email, exc)
        raise

    if not user or user.reset_code != reset_data.reset_code:
        logger.warning(
            "Invalid reset transaction attempt for email=%s", reset_data.email
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset transaction. Please restart the password reset flow.",
        )

    try:
        user.password = await hash_password(reset_data.new_password)
        user.reset_code = None
        db.add(user)
        await db.commit()
        logger.info("Password reset successful for email=%s", reset_data.email)
    except SQLAlchemyError as exc:
        logger.error("DB error saving new password for email=%s — %s", reset_data.email, exc)
        raise

    return {"message": "Password updated successfully. You can now log in."}
