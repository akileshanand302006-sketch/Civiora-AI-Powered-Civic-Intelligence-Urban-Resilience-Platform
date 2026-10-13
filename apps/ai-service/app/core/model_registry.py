# ============================================================
# Civiora AI Model Registry & Lifecycle Manager
# Hardware-Aware Lazy Loading, VRAM Throttling & Model State
# ============================================================

import logging
from typing import Dict, Any, Optional
from app.config import settings
from app.core.storage_budget import StorageBudgetManager
from app.models.yolo_detector import YOLODetector
from app.models.ocr_engine import OCREngine
from app.models.qwen_vl_engine import QwenVLEngine
from app.models.clip_embeddings import CLIPEmbeddingEngine
from app.models.damage_segmentation import DamageSegmentationEngine

logger = logging.getLogger("civiora.ai.registry")


class ModelRegistry:
    """
    Central lifecycle manager for all 5 Civiora AI models.
    Enforces sequential initialization, lazy loading, and VRAM management.
    """

    def __init__(self):
        self.budget_manager = StorageBudgetManager(
            base_dir=settings.BASE_DIR,
            budget_gb=settings.AI_STORAGE_BUDGET_GB,
        )

        # Lazy model references
        self._detector: Optional[YOLODetector] = None
        self._ocr: Optional[OCREngine] = None
        self._qwen_vl: Optional[QwenVLEngine] = None
        self._clip: Optional[CLIPEmbeddingEngine] = None
        self._segmentation: Optional[DamageSegmentationEngine] = None

    @property
    def detector(self) -> YOLODetector:
        """Model 1: YOLO11 Object Detector"""
        if self._detector is None:
            self._detector = YOLODetector(
                model_path=settings.YOLO11_MODEL_PATH,
                conf_threshold=settings.YOLO11_CONF_THRESHOLD,
                iou_threshold=settings.YOLO11_IOU_THRESHOLD,
            )
        return self._detector

    @property
    def ocr(self) -> OCREngine:
        """Model 2: PaddleOCR Text Recognition"""
        if self._ocr is None:
            self._ocr = OCREngine(
                lang=settings.OCR_LANG,
                min_confidence=settings.OCR_MIN_CONFIDENCE,
            )
        return self._ocr

    @property
    def qwen_vl(self) -> QwenVLEngine:
        """Model 3: Qwen2.5-VL Image Understanding"""
        if self._qwen_vl is None:
            self._qwen_vl = QwenVLEngine(
                model_id=settings.QWEN_VL_MODEL_ID,
                max_new_tokens=settings.QWEN_MAX_NEW_TOKENS,
            )
        return self._qwen_vl

    @property
    def clip(self) -> CLIPEmbeddingEngine:
        """Model 4: CLIP Embedding & Similarity Matcher"""
        if self._clip is None:
            self._clip = CLIPEmbeddingEngine(
                model_id=settings.CLIP_MODEL_ID,
            )
        return self._clip

    @property
    def segmentation(self) -> DamageSegmentationEngine:
        """Model 5: Dedicated Damage Segmentation"""
        if self._segmentation is None:
            self._segmentation = DamageSegmentationEngine(
                model_path=settings.SEGMENTATION_MODEL_PATH,
                conf_threshold=settings.SEGMENTATION_CONF_THRESHOLD,
            )
        return self._segmentation

    def get_models_status(self) -> Dict[str, Any]:
        """Returns readiness, versions, and memory status of all 5 model families."""
        storage_rep = self.budget_manager.get_storage_report()

        yolo_info = {
            "family": "YOLO11",
            "status": "available",
            "version": self.detector.model_version,
            "model_path": settings.YOLO11_MODEL_PATH,
            "conf_threshold": settings.YOLO11_CONF_THRESHOLD,
        }
        ocr_info = {
            "family": "PaddleOCR",
            "status": "available",
            "version": self.ocr.model_version,
            "lang": settings.OCR_LANG,
            "engine": self.ocr._engine_type,
        }
        qwen_info = {
            "family": "Qwen2.5-VL",
            "status": "available",
            "version": self.qwen_vl.model_version,
            "model_id": settings.QWEN_VL_MODEL_ID,
        }
        clip_info = {
            "family": "CLIP",
            "status": "available",
            "version": self.clip.model_version,
            "model_id": settings.CLIP_MODEL_ID,
            "dimensions": 512,
        }
        seg_info = {
            "family": "YOLO11-seg",
            "status": "available",
            "version": self.segmentation.model_version,
            "model_path": settings.SEGMENTATION_MODEL_PATH,
        }

        return {
            "status": "ready",
            "storage_budget": storage_rep,
            "models": {
                "yolo11": yolo_info,
                "yolo11_detector": yolo_info,
                "ocr": ocr_info,
                "paddleocr": ocr_info,
                "qwen2_5_vl": qwen_info,
                "clip": clip_info,
                "clip_embeddings": clip_info,
                "segmentation": seg_info,
                "damage_segmentation": seg_info,
            },
        }

    def unload_heavy_models(self) -> None:
        """Releases memory by clearing loaded models when needed."""
        self._qwen_vl = None
        self._clip = None
        import gc
        gc.collect()
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except Exception:
            pass


model_registry = ModelRegistry()
