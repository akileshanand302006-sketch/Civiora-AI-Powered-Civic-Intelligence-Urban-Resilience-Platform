# ============================================================
# Vision Routes
# ============================================================

from fastapi import APIRouter, UploadFile, File, HTTPException
from app.schemas.vision import VisionAnalysisResponse
from app.services.vision_service import vision_service

router = APIRouter(prefix="/vision", tags=["Computer Vision"])


@router.post("/analyze", response_model=VisionAnalysisResponse)
async def analyze_incident_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 15MB limit")

    return await vision_service.analyze_image(content, filename=file.filename or "")
