# ============================================================
# Dedicated Model 2: PaddleOCR Text Extraction Endpoint
# ============================================================

import io
from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image
from app.core.model_registry import model_registry

router = APIRouter(prefix="/ai", tags=["PaddleOCR Text Extraction"])


@router.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    """
    Dedicated endpoint for Model 2: PaddleOCR text detection and recognition.
    Extracts text from signboards, notices, reference IDs, and emergency keywords.
    """
    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
        result = model_registry.ocr.extract_text(image)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR text extraction failed: {e}")
