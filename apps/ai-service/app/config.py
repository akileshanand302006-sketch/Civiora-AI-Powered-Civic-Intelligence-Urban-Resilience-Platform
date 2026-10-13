# ============================================================
# Civiora AI Service Configuration
# Production Multi-Model Configuration & Resource Limits
# ============================================================

import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # Service Information
    APP_NAME: str = "Civiora AI Intelligence Engine"
    AI_SERVICE_PORT: int = 8000
    AI_SERVICE_HOST: str = "0.0.0.0"
    AI_SERVICE_SECRET: str = "civicpulse-ai-internal-key-2026"

    # Storage & Compute Constraints
    AI_STORAGE_BUDGET_GB: float = 40.0
    AI_TARGET_STORAGE_GB: float = 25.0
    AI_SAFETY_MARGIN_GB: float = 5.0
    BASE_DIR: Path = BASE_DIR
    ARTIFACTS_DIR: Path = BASE_DIR / "artifacts"
    MODELS_DIR: Path = BASE_DIR / "artifacts" / "models"
    DATASETS_DIR: Path = BASE_DIR / "datasets"

    # Device & Concurrency Settings
    DEVICE: str = "auto"  # 'auto', 'cuda', 'cpu'
    ENABLE_MIXED_PRECISION: bool = True
    MAX_IMAGE_SIZE_PX: int = 1920
    INFERENCE_TIMEOUT_SEC: int = 25

    # Model 1: YOLO11 Object Detector (Finetuned Checkpoint prioritized)
    YOLO11_MODEL_PATH: str = str(
        (BASE_DIR / "artifacts" / "models" / "yolo11_finetuned.pt")
        if (BASE_DIR / "artifacts" / "models" / "yolo11_finetuned.pt").exists()
        else (BASE_DIR / "artifacts" / "models" / "yolo11n.pt")
    )
    YOLO11_CONF_THRESHOLD: float = 0.25
    YOLO11_IOU_THRESHOLD: float = 0.45

    # Model 2: PaddleOCR Text Recognizer
    OCR_LANG: str = "en"
    OCR_USE_ANGLE_CLS: bool = True
    OCR_MIN_CONFIDENCE: float = 0.40

    # Model 3: Qwen2.5-VL Vision-Language Reasoner
    QWEN_VL_MODEL_ID: str = "Qwen/Qwen2.5-VL-3B-Instruct"
    QWEN_MAX_NEW_TOKENS: int = 512
    QWEN_TEMPERATURE: float = 0.2

    # Model 4: CLIP Similarity & Candidate Embedder
    CLIP_MODEL_ID: str = "openai/clip-vit-base-patch32"
    CLIP_SIMILARITY_THRESHOLD: float = 0.72
    GEO_CLUSTER_RADIUS_METERS: float = 300.0

    # Model 5: Dedicated Damage Segmentation
    SEGMENTATION_MODEL_PATH: str = str(BASE_DIR / "artifacts" / "models" / "yolo11n-seg.pt")
    SEGMENTATION_CONF_THRESHOLD: float = 0.35

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:4000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Ensure critical directories exist
settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
settings.DATASETS_DIR.mkdir(parents=True, exist_ok=True)
(settings.ARTIFACTS_DIR / "cache").mkdir(parents=True, exist_ok=True)
(settings.ARTIFACTS_DIR / "checkpoints").mkdir(parents=True, exist_ok=True)
