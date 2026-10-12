# ============================================================
# Risk Scoring Schemas
# ============================================================

from pydantic import BaseModel, Field
from typing import List, Optional


class RiskFactor(BaseModel):
    factor: str
    weight: float
    contribution: float
    explanation: str


class RiskAssessmentRequest(BaseModel):
    category: str
    priority: str = "medium"
    is_emergency: bool = False
    nearby_vulnerable_sites: List[str] = Field(default_factory=list)  # ["hospital", "school_zone"]
    weather_condition: Optional[str] = "clear"  # rain, storm, flooding
    historical_failure_count: int = 0


class RiskAssessmentResponse(BaseModel):
    score: int = Field(..., ge=0, le=100)
    level: str  # low, medium, high, critical
    recommended_priority: str
    recommended_sla_hours: int
    factors: List[RiskFactor]
    assessed_at: str
