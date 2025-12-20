import json
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "SyncPad API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = (
        "postgresql://syncpad:syncpad_dev_password@localhost:5432/syncpad"
    )
    MONGODB_URL: str = "mongodb://syncpad:syncpad_dev_password@localhost:27017/syncpad?authSource=admin"  # noqa: E501
    MONGODB_DB_NAME: str = "syncpad"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Keycloak
    KEYCLOAK_URL: str = "http://localhost:8080"
    KEYCLOAK_REALM: str = "syncpad"
    KEYCLOAK_CLIENT_ID: str = "syncpad-backend"
    KEYCLOAK_CLIENT_SECRET: str = "your-client-secret-here"

    # CORS - stored as string, parsed when accessed
    CORS_ORIGINS: str = "http://localhost:3000"

    # JWT
    JWT_ALGORITHM: str = "RS256"

    # WebSocket
    WS_MESSAGE_QUEUE: str = "syncpad:messages"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    def get_cors_origins(self) -> List[str]:
        """Parse CORS origins from string to list"""
        try:
            # Try JSON array format first
            return json.loads(self.CORS_ORIGINS)
        except (json.JSONDecodeError, TypeError):
            # Fall back to comma-separated values
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()
