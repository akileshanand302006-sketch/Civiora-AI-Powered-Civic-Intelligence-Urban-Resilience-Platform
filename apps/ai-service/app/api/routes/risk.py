# ============================================================
# Risk Engine Routes
# ============================================================

from fastapi import APIRouter
from app.schemas.risk import RiskAssessmentRequest, RiskAssessmentResponse
from app.services.risk_service import risk_engine

router = APIRouter(prefix="/risk", tags=["Risk Engine"])


@router.post("/evaluate", response_model=RiskAssessmentResponse)
def evaluate_incident_risk(req: RiskAssessmentRequest):
    return risk_engine.evaluate_risk(req)
