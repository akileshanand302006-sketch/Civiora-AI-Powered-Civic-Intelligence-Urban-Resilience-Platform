# ============================================================
# Dedicated Model 3: Qwen2.5-VL Image Understanding Endpoint
# ============================================================

import io
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from PIL import Image
from app.core.model_registry import model_registry

router = APIRouter(prefix="/ai", tags=["Qwen2.5-VL Image Understanding"])


@router.post("/describe-image")
async def describe_image(
    file: UploadFile = File(...),
    hint_category: Optional[str] = Form("other"),
):
    """
    Dedicated endpoint for Model 3: Qwen2.5-VL vision-language understanding.
    Returns structured factual description, visible evidence, and uncertainty estimate.
    """
    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
        result = model_registry.qwen_vl.describe_scene(
            image=image,
            detected_category=hint_category or "other",
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image understanding failed: {e}")
