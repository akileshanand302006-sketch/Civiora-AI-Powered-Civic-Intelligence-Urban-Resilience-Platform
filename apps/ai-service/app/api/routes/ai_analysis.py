# ============================================================
# Civiora Unified AI Analysis Router
# End-to-End Image Intelligence across all 5 Models
# ============================================================

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from app.pipelines.unified_analysis import unified_pipeline
from app.core.model_registry import model_registry

router = APIRouter(prefix="/ai", tags=["Unified Analysis"])


@router.get("/models")
async def get_models_metadata():
    """
    Returns live metadata, readiness, and storage statistics for all 5 model families.
    """
    return {
        "success": True,
        "data": model_registry.get_models_status(),
    }


@router.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    include_ocr: bool = Form(True),
    include_qwen: bool = Form(True),
    include_clip: bool = Form(True),
    include_segmentation: bool = Form(True),
):
    """
    Unified multimodal analysis on an uploaded image.
    Executes YOLO11 Detection, PaddleOCR Text, Qwen2.5-VL Scene Understanding,
    CLIP Embeddings, and Dedicated Damage Segmentation.
    """
    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty image payload received.")

        result = await unified_pipeline.analyze_image(
            image_bytes=content,
            filename=file.filename or "uploaded_image.jpg",
            include_ocr=include_ocr,
            include_qwen=include_qwen,
            include_clip=include_clip,
            include_segmentation=include_segmentation,
        )

        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI pipeline analysis failed: {str(e)}")
