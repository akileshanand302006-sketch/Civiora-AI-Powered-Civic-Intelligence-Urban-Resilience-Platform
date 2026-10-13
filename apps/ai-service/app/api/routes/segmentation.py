# ============================================================
# Dedicated Model 5: Damage Segmentation Endpoint (YOLO11-seg)
# ============================================================

import io
from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image
from app.core.model_registry import model_registry

router = APIRouter(prefix="/ai", tags=["Damage Segmentation"])


@router.post("/segment-damage")
async def segment_damage(file: UploadFile = File(...)):
    """
    Dedicated endpoint for Model 5: Dedicated Damage Segmentation.
    Computes polygonal masks, perimeter coordinates, and damage surface coverage %.
    """
    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
        result = model_registry.segmentation.segment_damage(image)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Damage segmentation failed: {e}")
