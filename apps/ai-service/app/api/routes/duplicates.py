# ============================================================
# Duplicate Detection Routes
# ============================================================

from fastapi import APIRouter
from app.schemas.duplicates import DuplicateCheckRequest, DuplicateCheckResponse
from app.services.duplicate_service import duplicate_service

router = APIRouter(prefix="/duplicates", tags=["Duplicate Detection"])


@router.post("/check", response_model=DuplicateCheckResponse)
def check_duplicate_incident(req: DuplicateCheckRequest):
    return duplicate_service.evaluate_duplicates(req)
