# ============================================================
# Computer Vision Schemas
# ============================================================

from pydantic import BaseModel, Field
from typing import List, Optional


class BoundingBox(BaseModel):
    x: float = Field(..., description="Normalized X coordinate (0-1)")
    y: float = Field(..., description="Normalized Y coordinate (0-1)")
    w: float = Field(..., description="Normalized Width (0-1)")
    h: float = Field(..., description="Normalized Height (0-1)")
    label: str
    confidence: float


class VisionAnalysisResponse(BaseModel):
    category: str
    confidence: float
    severity: str
    detected_objects: List[str]
    bounding_boxes: List[BoundingBox]
    surface_damage_percentage: Optional[float] = None
    processed_at: str
    model_version: str = "CivicPulse-YOLOv8-v2.4"
