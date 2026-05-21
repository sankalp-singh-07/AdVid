from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    DB_URL: str = "postgresql+asyncpg://dummyData/dummyDb"
    JWT_SECRET_KEY: str = "JWT_SECRET_KEY_DUMMY_ONE"
    JWT_REFRESH_SECRET_KEY: str = "JWT_REFRESH_SECRET_KEY_DUMMY_ONE"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    JWT_REFRESH_EXPIRE_MINUTES: int = 10080
    ENVIRONMENT: str = "development"
    SENTRY_DSN: str = "sentry-dsn"

    CLOUDINARY_CLOUD_NAME: str | None = None
    CLOUDINARY_API_KEY: str | None = None
    CLOUDINARY_API_SECRET: str | None = None

    GEMINI_API_KEY: str | None = None
    GEMINI_IMAGE_MODEL: str = "gemini-3-pro-image-preview"
    GEMINI_VIDEO_MODEL: str = "veo-2.0-generate-002"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
