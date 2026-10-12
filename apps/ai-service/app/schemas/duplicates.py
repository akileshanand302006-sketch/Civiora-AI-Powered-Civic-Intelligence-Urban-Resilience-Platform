# ============================================================
# Duplicate Detection & Clustering Schemas
# ============================================================

from pydantic import BaseModel, Field
from typing import List, Tuple, Optional


class CandidateIncident(BaseModel):
    id: str
    incident_number: str
    title: str
    category: str
    coordinates: Tuple[float, float]  # (lng, lat)
    created_at: str


class DuplicateCheckRequest(BaseModel):
    category: str
    title: str
    description: str
    coordinates: Tuple[float, float]
    candidates: List[CandidateIncident]


class DuplicateMatch(BaseModel):
    incident_id: str
    incident_number: str
    distance_meters: float
    semantic_similarity: float
    overall_confidence: float
    is_duplicate: bool


class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    cluster_master_id: Optional[str] = None
    matches: List[DuplicateMatch]
    total_candidates_evaluated: int
