# ============================================================
# CivicPulse AI Service Entry Point (FastAPI)
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import vision, nlp, risk, duplicates, health

app = FastAPI(
    title="CivicPulse AI Intelligence Service",
    description="Multi-modal AI service powering computer vision, NLP triage, multi-factor risk, and clustering",
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

# Include API Routers
app.include_router(health.router)
app.include_router(vision.router, prefix="/api/v1")
app.include_router(nlp.router, prefix="/api/v1")
app.include_router(risk.router, prefix="/api/v1")
app.include_router(duplicates.router, prefix="/api/v1")


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
