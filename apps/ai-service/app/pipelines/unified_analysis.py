# ============================================================
# Civiora Unified AI Analysis Pipeline
# Orchestrates YOLO11, PaddleOCR, Qwen2.5-VL, CLIP & Segmentation
# ============================================================

import io
import time
import logging
from typing import Dict, Any, Optional
from PIL import Image
from app.core.model_registry import model_registry

logger = logging.getLogger("civiora.ai.pipeline")


class UnifiedAnalysisPipeline:
    """
    Coordinates multi-model evaluation across all 5 model families.
    Isolates errors so individual model failures do not abort the entire pipeline.
    """

    def __init__(self):
        self.registry = model_registry

    async def analyze_image(
        self,
        image_bytes: bytes,
        filename: str = "",
        include_ocr: bool = True,
        include_qwen: bool = True,
        include_clip: bool = True,
        include_segmentation: bool = True,
    ) -> Dict[str, Any]:
        """
        Executes complete multi-model visual intelligence pipeline.
        """
        start_time = time.time()

        # Step 1: Secure decode and validation
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img_w, img_h = image.size
        except Exception as e:
            raise ValueError(f"Invalid or corrupted image payload: {e}")

        # Step 2: Model 1 - YOLO11 Detection
        yolo_result = {}
        try:
            yolo_result = self.registry.detector.detect(image)
        except Exception as e:
            logger.error(f"YOLO11 execution error: {e}")
            yolo_result = {
                "model_version": "YOLO11n-Error",
                "detected_count": 0,
                "dominant_category": "other",
                "confidence": 0.0,
                "detections": [],
                "latency_ms": 0.0,
            }

        dominant_category = yolo_result.get("dominant_category", "other")
        detected_objects = [d["raw_label"] for d in yolo_result.get("detections", [])]

        # Step 3: Model 2 - PaddleOCR Text Extraction
        ocr_result = {}
        if include_ocr:
            try:
                ocr_result = self.registry.ocr.extract_text(image)
            except Exception as e:
                logger.error(f"OCR execution error: {e}")
                ocr_result = {"full_text": "", "records": [], "emergency_keywords": [], "latency_ms": 0.0}

        extracted_text = ocr_result.get("full_text", "")

        # Step 4: Model 3 - Qwen2.5-VL Structured Scene Understanding
        qwen_result = {}
        if include_qwen:
            try:
                qwen_result = self.registry.qwen_vl.describe_scene(
                    image=image,
                    detected_category=dominant_category,
                    detected_objects=detected_objects,
                    extracted_text=extracted_text,
                )
            except Exception as e:
                logger.error(f"Qwen2.5-VL execution error: {e}")
                qwen_result = {"structured_output": {}, "latency_ms": 0.0}

        # Step 5: Model 4 - CLIP Embeddings
        clip_result = {}
        if include_clip:
            try:
                clip_result = self.registry.clip.embed_image(image)
            except Exception as e:
                logger.error(f"CLIP embedding error: {e}")
                clip_result = {"embedding": [], "dimensions": 0, "latency_ms": 0.0}

        # Step 6: Model 5 - Dedicated Damage Segmentation
        segmentation_result = {}
        if include_segmentation:
            try:
                segmentation_result = self.registry.segmentation.segment_damage(image)
            except Exception as e:
                logger.error(f"Segmentation execution error: {e}")
                segmentation_result = {
                    "segments_count": 0,
                    "total_damage_coverage_pct": 0.0,
                    "severity_assessment": "none",
                    "segments": [],
                    "latency_ms": 0.0,
                }

        # Step 7: Explainable Severity Scoring Engine
        from app.services.severity_engine import (
            severity_engine,
            DetectedHazard,
            BoundingBox,
        )

        detected_hazards = []
        for d in yolo_result.get("detections", []):
            box_obj = None
            if "box" in d:
                b = d["box"]
                box_obj = BoundingBox(
                    x_min=b.get("x_min", 0.0),
                    y_min=b.get("y_min", 0.0),
                    x_max=b.get("x_max", 1.0),
                    y_max=b.get("y_max", 1.0),
                )
            detected_hazards.append(
                DetectedHazard(
                    category=d.get("canonical_category", d.get("raw_label", "other")),
                    confidence=d.get("confidence", 0.5),
                    box=box_obj,
                    source_model="yolo11",
                )
            )

        coverage_pct = segmentation_result.get("total_damage_coverage_pct", 0.0)
        em_keywords = ocr_result.get("emergency_keywords", [])

        severity_evaluation = severity_engine.evaluate(
            hazards=detected_hazards,
            segmentation_coverage_pct=coverage_pct,
            emergency_keywords=em_keywords,
        )

        final_severity = severity_evaluation.band

        total_latency_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "success": True,
            "filename": filename,
            "image_dimensions": {"width": img_w, "height": img_h},
            "primary_synthesis": {
                "suggested_category": dominant_category,
                "confidence": yolo_result.get("confidence", 0.0),
                "severity": final_severity,
                "severity_score": severity_evaluation.score,
                "is_critical": (final_severity == "critical"),
                "scene_description": qwen_result.get("structured_output", {}).get(
                    "image_description", f"Detected {dominant_category} hazard."
                ),
                "requires_human_review": severity_evaluation.review_required,
                "severity_assessment": severity_evaluation.model_dump(),
            },
            "model_breakdown": {
                "yolo11_detection": yolo_result,
                "paddleocr_text": ocr_result,
                "qwen2_5_vl_understanding": qwen_result,
                "clip_embeddings": {
                    "dimensions": clip_result.get("dimensions", 0),
                    "embedding": clip_result.get("embedding", []),
                    "latency_ms": clip_result.get("latency_ms", 0.0),
                },
                "damage_segmentation": segmentation_result,
            },
            "data": {
                "primary_category": dominant_category,
                "suggested_category": dominant_category,
                "overall_confidence": yolo_result.get("confidence", 0.0),
                "recommended_severity": final_severity,
                "severity_score": severity_evaluation.score,
                "model_version": yolo_result.get("model_version", "YOLO11n-Civic-v1.0"),
                "uncertain": yolo_result.get("uncertain", False),
                "warnings": severity_evaluation.reasons if yolo_result.get("uncertain", False) else [],
                "stages": {
                    "detector_yolo11": yolo_result,
                    "ocr_text": ocr_result,
                    "qwen2_5_vl": qwen_result,
                    "clip_embeddings": clip_result,
                    "damage_segmentation": segmentation_result,
                },
                "severity_assessment": severity_evaluation.model_dump(),
                "human_review_required": severity_evaluation.review_required,
                "review_reasons": severity_evaluation.reasons,
            },
            "performance_metrics": {
                "total_pipeline_latency_ms": total_latency_ms,
                "yolo_ms": yolo_result.get("latency_ms", 0.0),
                "ocr_ms": ocr_result.get("latency_ms", 0.0),
                "qwen_ms": qwen_result.get("latency_ms", 0.0),
                "clip_ms": clip_result.get("latency_ms", 0.0),
                "segmentation_ms": segmentation_result.get("latency_ms", 0.0),
            },
        }


unified_pipeline = UnifiedAnalysisPipeline()
