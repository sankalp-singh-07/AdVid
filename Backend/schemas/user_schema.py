import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


def validate_strong_password(value: str) -> str:
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"\d", value):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[@$!%*?&]", value):
        raise ValueError(
            "Password must contain at least one special character "
            "(@, $, !, %, *, ?, or &)"
        )
    return value


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2)
    password: str = Field(
        ...,
        min_length=8,
        description="Password must contain an uppercase letter, digit, "
        "and special character.",
    )
    email: EmailStr
    mobile: str = Field(
        ...,
        pattern=r"^\+\d{1,3}\d{10}$",
        description="Mobile number must start with a country code "
        "followed by 10 digits",
    )
    dob: str

    @field_validator("password")
    @classmethod
    def validate_password_field(cls, value: str) -> str:
        return validate_strong_password(value)

    @field_validator("dob")
    @classmethod
    def validate_dob(cls, value):
        for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
            try:
                datetime.strptime(value, fmt)
                return value
            except ValueError:
                pass
        raise ValueError(
            "dob must be in 'DD/MM/YYYY' or 'YYYY-MM-DD' format "
            "and be a valid date"
        )


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    mobile: str
    dob: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    message: str
    user: UserResponse


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyResetCodeRequest(BaseModel):
    email: EmailStr
    reset_code: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_code: str
    new_password: str = Field(
        ...,
        min_length=8,
        description="Password must contain an uppercase letter, digit, "
        "and special character.",
    )

    @field_validator("new_password")
    @classmethod
    def validate_new_password_field(cls, value: str) -> str:
        return validate_strong_password(value)
