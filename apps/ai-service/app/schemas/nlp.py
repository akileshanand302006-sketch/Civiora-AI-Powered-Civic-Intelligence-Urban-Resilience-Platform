# ============================================================
# NLP Semantic Extraction Schemas
# ============================================================

from pydantic import BaseModel, Field
from typing import List, Optional


class NLPAnalysisRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=300)
    description: str = Field(..., min_length=5, max_length=5000)
    reported_category: Optional[str] = None


class NLPExtractionResult(BaseModel):
    predicted_category: str
    category_confidence: float
    urgency_level: str  # low, medium, high, critical
    sentiment: str      # frustrated, neutral, alarmed
    key_entities: List[str]
    identified_issue: str
    assessed_impact: str
    potential_hazards: List[str]
    model_version: str = "CivicPulse-Transformer-NLP-v2.1"
