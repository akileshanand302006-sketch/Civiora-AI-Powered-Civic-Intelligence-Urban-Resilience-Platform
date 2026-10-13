# ============================================================
# Model 5: Dedicated Damage Segmentation Engine (YOLO11-seg)
# Pixel-Level Region & Visible Hazard Extent Segmentation
# ============================================================

import time
import logging
from typing import List, Dict, Any, Optional
from PIL import Image
import numpy as np
from ultralytics import YOLO

logger = logging.getLogger("civiora.ai.segmentation")


class DamageSegmentationEngine:
    """
    YOLO11 instance segmentation engine for civic infrastructure damage.
    Calculates pixel-level polygonal masks, bounding envelopes, and
    relative image damage surface coverage.
    """

    def __init__(self, model_path: str, conf_threshold: float = 0.35):
        self.model_path = model_path
        self.conf_threshold = conf_threshold
        self.model_version = "YOLO11n-Seg-v1.0"
        self._model: Optional[YOLO] = None

    def _load_model(self) -> YOLO:
        if self._model is None:
            logger.info(f"Loading YOLO11-seg model from {self.model_path}")
            self._model = YOLO(self.model_path)
        return self._model

    def segment_damage(self, image: Image.Image) -> Dict[str, Any]:
        """
        Runs instance segmentation on the provided image and extracts
        polygonal masks and estimated damaged area percentage.
        """
        start_time = time.time()
        model = self._load_model()
        img_w, img_h = image.size
        total_pixels = img_w * img_h

        results = model.predict(
            image,
            conf=self.conf_threshold,
            verbose=False,
        )

        segments: List[Dict[str, Any]] = []
        accumulated_damage_pixels = 0

        if results and len(results) > 0:
            res = results[0]
            masks = res.masks
            boxes = res.boxes

            if masks is not None and boxes is not None:
                for idx, mask in enumerate(masks):
                    cls_id = int(boxes.cls[idx].item())
                    label = res.names.get(cls_id, f"damage_zone_{cls_id}")
                    conf = float(boxes.conf[idx].item())

                    # Normalized polygon points [ [x, y], ... ]
                    xy_points = mask.xyn[0].tolist() if len(mask.xyn) > 0 else []

                    # Approximate polygon pixel area using Shoelace formula
                    if len(xy_points) >= 3:
                        poly_px = [(p[0] * img_w, p[1] * img_h) for p in xy_points]
                        poly_area = 0.5 * abs(
                            sum(
                                poly_px[i][0] * poly_px[(i + 1) % len(poly_px)][1]
                                - poly_px[(i + 1) % len(poly_px)][0] * poly_px[i][1]
                                for i in range(len(poly_px))
                            )
                        )
                        accumulated_damage_pixels += poly_area
                    else:
                        poly_area = 0.0

                    coverage_pct = round((poly_area / total_pixels) * 100, 2)

                    segments.append({
                        "segment_id": idx + 1,
                        "label": label,
                        "confidence": round(conf, 4),
                        "polygon_points": [[round(p[0], 4), round(p[1], 4)] for p in xy_points[:40]], # compact 40-pt perimeter
                        "point_count": len(xy_points),
                        "estimated_coverage_percentage": coverage_pct,
                    })

        total_damage_pct = round(min(100.0, (accumulated_damage_pixels / total_pixels) * 100), 2)
        duration_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "model_version": self.model_version,
            "segments_count": len(segments),
            "total_damage_coverage_pct": total_damage_pct,
            "severity_assessment": (
                "critical" if total_damage_pct >= 25.0
                else "high" if total_damage_pct >= 10.0
                else "medium" if total_damage_pct >= 3.0
                else "low" if segments else "none"
            ),
            "segments": segments,
            "latency_ms": duration_ms,
        }
