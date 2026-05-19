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

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
