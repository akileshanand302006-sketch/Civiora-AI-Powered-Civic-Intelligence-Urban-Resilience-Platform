# ============================================================
# Dedicated Model 1: YOLO11 Civic Detection Endpoint
# ============================================================

import io
from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image
from app.core.model_registry import model_registry

router = APIRouter(prefix="/ai", tags=["YOLO11 Detection"])


@router.post("/detect-civic-issues")
async def detect_civic_issues(file: UploadFile = File(...)):
    """
    Dedicated endpoint for Model 1: YOLO11 object detection.
    Maps municipal hazards to Civiora canonical taxonomy.
    """
    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
        result = model_registry.detector.detect(image)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"YOLO11 detection failed: {e}")
