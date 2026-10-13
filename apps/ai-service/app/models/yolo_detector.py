# ============================================================
# Model 1: YOLO11 Civic Object Detector
# Production Inference Engine for Municipal Damage & Hazards
# ============================================================

import time
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from PIL import Image
import numpy as np
from ultralytics import YOLO

logger = logging.getLogger("civiora.ai.yolo11")

# Civiora Canonical Master Hazard Taxonomy
# Synchronized with @civicpulse/shared constants
CIVIC_TAXONOMY = {
    "pothole": ["pothole", "cavity", "crater", "road depression", "asphalt defect", "road hole"],
    "road_damage": ["road damage", "crack", "road crack", "alligator crack", "fissure", "pavement crack", "asphalt damage"],
    "garbage_accumulation": ["garbage", "trash", "waste", "litter", "rubbish", "dump", "debris", "garbage accumulation", "dumpster overflow", "trash heap"],
    "illegal_dumping": ["illegal dump", "illegal dumping", "fly-tipping", "unauthorized waste", "construction debris dump"],
    "drainage_blockage": ["drainage blockage", "drainage obstruction", "drain", "culvert", "manhole", "sewer", "gutter", "clogged drain", "storm drain blockage"],
    "water_leakage": ["water leakage", "water leak", "burst pipe", "pipe leak", "hydrant leak", "water pipe breach"],
    "flooding": ["flooding", "flood", "water", "waterlogging", "submerged", "puddle", "overflow", "flash flood"],
    "broken_streetlight": ["broken streetlight", "damaged streetlight", "street light", "lamp", "pole", "broken light", "dark streetlight", "light pole damage"],
    "damaged_traffic_signal": ["damaged traffic signal", "damaged traffic sign", "traffic light", "traffic signal", "stop sign", "sign", "traffic sign", "signal head"],
    "damaged_sidewalk": ["damaged sidewalk", "broken curb", "cracked pavement", "pavement slab", "uneven walkway", "sidewalk damage"],
    "fallen_tree": ["fallen tree", "tree", "branch", "log", "vegetation obstruction", "downed limb", "fallen branch"],
    "public_infrastructure_damage": ["public infrastructure damage", "guardrail", "barrier", "bridge damage", "retaining wall", "bus stop damage", "handrail defect"],
    "unsafe_public_space": ["unsafe public space", "unsafe space", "hazard area", "unsecured excavation", "open trench", "missing cover", "uncovered manhole"],
    "exposed_electrical_hazard": ["exposed electrical hazard", "exposed wire", "downed powerline", "electrical panel", "sparking wire", "loose cable"],
    "traffic_obstruction": ["traffic obstruction", "road block", "stalled vehicle", "debris on road", "lane obstruction"],
    "environmental_hazard": ["environmental hazard", "chemical spill", "oil slick", "hazardous waste", "air emission", "pollutant spill"],
    "emergency_incident": ["emergency incident", "fire", "structural collapse", "gas leak explosion", "major disaster"],
    "other": ["other", "unclassified", "general object", "unknown"],
}

# Explicit deterministic mapping from source datasets, COCO labels, and model outputs to canonical keys
RAW_AND_COCO_TO_CIVIC_MAP = {
    # Fine-tuned model output classes (yolo11_finetuned.pt)
    "garbage": "garbage_accumulation",
    "road_crack": "road_damage",
    "drainage_obstruction": "drainage_blockage",
    "damaged_streetlight": "broken_streetlight",
    "damaged_traffic_sign": "damaged_traffic_signal",
    "water_leak": "water_leakage",
    # Standard COCO object classes
    "traffic light": "damaged_traffic_signal",
    "stop sign": "damaged_traffic_signal",
    "bench": "public_infrastructure_damage",
    "fire hydrant": "water_leakage",
}


class YOLODetector:
    """
    YOLO11 compact detection engine for civic hazard identification.
    """

    def __init__(self, model_path: str, conf_threshold: float = 0.35, iou_threshold: float = 0.45):
        self.model_path = model_path
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.model_version = "YOLO11n-Civic-v1.0"
        self._model: Optional[YOLO] = None

    def _load_model(self) -> YOLO:
        if self._model is None:
            logger.info(f"Loading YOLO11 model from {self.model_path}")
            self._model = YOLO(self.model_path)
        return self._model

    def detect(self, image: Image.Image) -> Dict[str, Any]:
        """
        Runs object detection on the provided PIL image and maps
        detected objects to Civiora's canonical civic taxonomy.
        """
        start_time = time.time()
        model = self._load_model()

        # Run inference
        results = model.predict(
            image,
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            verbose=False,
        )

        detections: List[Dict[str, Any]] = []
        img_w, img_h = image.size

        if results and len(results) > 0:
            res = results[0]
            boxes = res.boxes

            for box in boxes:
                cls_id = int(box.cls[0].item())
                raw_label = res.names.get(cls_id, f"class_{cls_id}")
                conf = float(box.conf[0].item())

                # Normalized coordinates [x_min, y_min, x_max, y_max]
                xyxy = box.xyxy[0].tolist()
                x_min = max(0.0, min(1.0, xyxy[0] / img_w))
                y_min = max(0.0, min(1.0, xyxy[1] / img_h))
                x_max = max(0.0, min(1.0, xyxy[2] / img_w))
                y_max = max(0.0, min(1.0, xyxy[3] / img_h))

                # Map label to Civiora canonical taxonomy
                canonical_cat = self._map_to_canonical(raw_label)

                detections.append({
                    "raw_label": raw_label,
                    "canonical_category": canonical_cat,
                    "confidence": round(conf, 4),
                    "box": {
                        "x_min": round(x_min, 4),
                        "y_min": round(y_min, 4),
                        "x_max": round(x_max, 4),
                        "y_max": round(y_max, 4),
                        "width": round(x_max - x_min, 4),
                        "height": round(y_max - y_min, 4),
                    },
                })

        # Calculate dominant category and uncertainty
        dominant_cat = "other"
        highest_conf = 0.0

        for d in detections:
            if d["confidence"] > highest_conf:
                highest_conf = d["confidence"]
                dominant_cat = d["canonical_category"]

        duration_ms = round((time.time() - start_time) * 1000, 2)
        is_uncertain = (len(detections) == 0) or (highest_conf < self.conf_threshold) or (dominant_cat == "other")

        return {
            "model_version": self.model_version,
            "detected_count": len(detections),
            "dominant_category": dominant_cat,
            "suggested_category": dominant_cat,
            "confidence": round(highest_conf, 4) if detections else 0.0,
            "uncertain": is_uncertain,
            "detections": detections,
            "latency_ms": duration_ms,
        }

    def _map_to_canonical(self, label: str) -> str:
        clean = label.lower().strip()
        if clean in RAW_AND_COCO_TO_CIVIC_MAP:
            return RAW_AND_COCO_TO_CIVIC_MAP[clean]

        if clean in CIVIC_TAXONOMY:
            return clean

        for cat, synonyms in CIVIC_TAXONOMY.items():
            if clean == cat or any(syn in clean for syn in synonyms):
                return cat

        return "other"
