# ============================================================
# CivicPulse AI Service Entry Point (FastAPI)
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import (
    health,
    ai_analysis,
    detector,
    ocr,
    vision_language,
    duplicates,
    segmentation,
    vision,
    nlp,
    risk,
)

app = FastAPI(
    title="Civiora AI Intelligence Engine",
    description="Production Multi-modal AI Service: YOLO11, PaddleOCR, Qwen2.5-VL, CLIP, and Damage Segmentation",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Core Liveness & Readiness Probes
app.include_router(health.router)

# Mount Civiora Unified Multimodal AI API (/api/v1)
app.include_router(ai_analysis.router, prefix="/api/v1")
app.include_router(detector.router, prefix="/api/v1")
app.include_router(ocr.router, prefix="/api/v1")
app.include_router(vision_language.router, prefix="/api/v1")
app.include_router(duplicates.router, prefix="/api/v1")
app.include_router(segmentation.router, prefix="/api/v1")

# Mount root-level aliases for direct convenience (/ai/...)
app.include_router(ai_analysis.router)
app.include_router(detector.router)
app.include_router(ocr.router)
app.include_router(vision_language.router)
app.include_router(segmentation.router)

# Backwards compatibility legacy routes
app.include_router(vision.router, prefix="/api/v1")
app.include_router(nlp.router, prefix="/api/v1")
app.include_router(risk.router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "service": "CivicPulse AI Service",
        "version": "1.0.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.AI_SERVICE_HOST, port=settings.AI_SERVICE_PORT, reload=True)
