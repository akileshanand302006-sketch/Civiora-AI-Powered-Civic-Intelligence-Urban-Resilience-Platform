# ============================================================
# Dedicated Model 4: CLIP Semantic Duplicate Retrieval Routes
# ============================================================

import io
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Tuple, Optional, Dict, Any
from PIL import Image
from app.core.model_registry import model_registry
from app.pipelines.duplicate_pipeline import duplicate_pipeline
from app.schemas.duplicates import DuplicateCheckRequest, DuplicateCheckResponse
from app.services.duplicate_service import duplicate_service

router = APIRouter(prefix="", tags=["CLIP Similarity & Duplicates"])


class SimilarIncidentRequest(BaseModel):
    query_category: str
    query_coordinates: Tuple[float, float]  # [lng, lat]
    query_embedding: Optional[List[float]] = None
    candidates: List[Dict[str, Any]]
    geo_radius_meters: Optional[float] = 300.0
    similarity_threshold: Optional[float] = 0.65


@router.post("/duplicates/check", response_model=DuplicateCheckResponse)
def check_duplicate_incident(req: DuplicateCheckRequest):
    """Backward-compatible text/distance duplicate evaluation."""
    return duplicate_service.evaluate_duplicates(req)


@router.post("/ai/embed-image")
async def embed_image(file: UploadFile = File(...)):
    """Generates 512-dimensional CLIP embedding for an uploaded image."""
    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
        result = model_registry.clip.embed_image(image)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CLIP embedding generation failed: {e}")


@router.post("/ai/find-similar-incidents")
def find_similar_incidents(req: SimilarIncidentRequest):
    """
    Ranks candidate incidents using Model 4 (CLIP embeddings) combined with
    Haversine geodesic distance, temporal recency, and category compatibility.
    """
    try:
        embedding = req.query_embedding or []
        result = duplicate_pipeline.evaluate_candidates(
            query_embedding=embedding,
            query_location=req.query_coordinates,
            query_category=req.query_category,
            candidates=req.candidates,
            geo_radius_meters=req.geo_radius_meters or 300.0,
            similarity_threshold=req.similarity_threshold or 0.65,
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Duplicate candidate ranking failed: {e}")
