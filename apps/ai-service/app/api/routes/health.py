# ============================================================
# Civiora AI Health Check Routes
# Liveness Probe (/health) & Readiness Probe (/health/ready)
# ============================================================

from fastapi import APIRouter
from datetime import datetime
from app.core.model_registry import model_registry

router = APIRouter(tags=["Health"])


@router.get("/health")
def liveness_probe():
    """Liveness probe: verifies the FastAPI service is running."""
    return {
        "status": "healthy",
        "service": "civiora-ai-intelligence-engine",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/health/ready")
def readiness_probe():
    """Readiness probe: reports actual model readiness, versions, and storage budget."""
    models_status = model_registry.get_models_status()
    return {
        "ready": True,
        "service": "civiora-ai-intelligence-engine",
        "timestamp": datetime.utcnow().isoformat(),
        "storage": models_status["storage_budget"],
        "models": models_status["models"],
    }
