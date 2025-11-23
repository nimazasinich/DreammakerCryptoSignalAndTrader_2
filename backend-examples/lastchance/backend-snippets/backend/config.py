import os
from typing import List

from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )
    
    # Application
    APP_NAME: str = "Bolt AI Crypto API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./crypto_ai.db"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 300

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    JWT_SECRET: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    CORS_CREDENTIALS: bool = True

    # API Keys
    API_KEY_COINMARKETCAP: str = ""
    API_KEY_COINGECKO: str = ""
    API_KEY_CRYPTOCOMPARE: str = ""

    # External APIs
    COINGECKO_API_URL: str = "https://api.coingecko.com/api/v3"
    BINANCE_API_URL: str = "https://api.binance.com/api/v3"
    BINANCE_WS_URL: str = "wss://stream.binance.com:9443/ws"

    # Telegram Bot
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@boltaicrypto.com"

    # AI Model
    MODEL_PATH: str = "./models"
    MODEL_VERSION: str = "1.0.0"
    TRAINING_ENABLED: bool = True
    RETRAINING_INTERVAL_HOURS: int = 24

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    RATE_LIMIT_BURST: int = 20

    # Monitoring
    PROMETHEUS_ENABLED: bool = True
    LOG_LEVEL: str = "INFO"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()