# ============================================================
# NLP Semantic Extraction Routes
# ============================================================

from fastapi import APIRouter
from app.schemas.nlp import NLPAnalysisRequest, NLPExtractionResult
from app.services.nlp_service import nlp_service

router = APIRouter(prefix="/nlp", tags=["Natural Language Processing"])


@router.post("/extract", response_model=NLPExtractionResult)
def extract_semantic_features(req: NLPAnalysisRequest):
    return nlp_service.analyze_text(req)
