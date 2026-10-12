# ============================================================
# CivicPulse AI Service Configuration
# ============================================================

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    AI_SERVICE_PORT: int = 8000
    AI_SERVICE_HOST: str = "0.0.0.0"
    AI_SERVICE_SECRET: str = "civicpulse-ai-internal-key-2026"
    MODEL_CONFIDENCE_THRESHOLD: float = 0.65
    GEO_CLUSTER_RADIUS_METERS: int = 150
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:4000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
