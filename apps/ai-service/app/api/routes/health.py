# ============================================================
# Health Check Route
# ============================================================

from fastapi import APIRouter
from datetime import datetime

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "civicpulse-ai-service",
        "timestamp": datetime.utcnow().isoformat(),
        "pipelines": {
            "computer_vision": "active",
            "semantic_nlp": "active",
            "risk_engine": "active",
            "clustering": "active",
        },
    }
