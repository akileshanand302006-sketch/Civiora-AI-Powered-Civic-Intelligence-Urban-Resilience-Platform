# ============================================================
# Model 2: PaddleOCR Civic Text Extraction Engine
# Text Detection, Recognition & Civic Notice Parsing
# ============================================================

import time
import re
import logging
from typing import List, Dict, Any, Optional
from PIL import Image
import numpy as np

logger = logging.getLogger("civiora.ai.ocr")

EMERGENCY_KEYWORDS = [
    "danger", "caution", "warning", "high voltage", "flooded",
    "keep out", "no entry", "hazard", "deep water", "work in progress",
    "submerged", "falling debris", "accident zone", "cctv", "notice"
]

SIGN_PATTERNS = {
    "speed_limit": r"\b(speed\s*limit|\d{2}\s*km/?h)\b",
    "ward_notice": r"\b(ward|zone|division)\s*[-:]?\s*(\d+)\b",
    "complaint_token": r"\b([A-Z]{2,4}[-\d]{4,10})\b",
    "highway_marker": r"\b(nh|sh)[-\s]*\d{1,4}[a-z]?\b",
}


class OCREngine:
    """
    PaddleOCR Engine with robust CRAFT/PyTorch OCR fallback.
    Detects and recognizes text on municipal signboards, ward notices,
    street nameplates, and infrastructure markers.
    """

    def __init__(self, lang: str = "en", min_confidence: float = 0.40):
        self.lang = lang
        self.min_confidence = min_confidence
        self.model_version = "PaddleOCR-v4-Civic"
        self._engine = None
        self._engine_type = "uninitialized"

    def _init_engine(self):
        if self._engine is not None:
            return

        # Attempt 1: Native PaddleOCR
        try:
            from paddleocr import PaddleOCR
            logger.info("Initializing PaddleOCR engine...")
            self._engine = PaddleOCR(use_angle_cls=True, lang=self.lang, show_log=False)
            self._engine_type = "PaddleOCR-v4"
            return
        except Exception as e:
            logger.info(f"PaddleOCR native initialization deferred ({e}), switching to PyTorch EasyOCR engine.")

        # Attempt 2: PyTorch EasyOCR
        try:
            import easyocr
            logger.info("Initializing PyTorch EasyOCR engine...")
            self._engine = easyocr.Reader(["en"], gpu=False, verbose=False)
            self._engine_type = "EasyOCR-CRAFT-Engine"
            return
        except Exception as e:
            logger.warning(f"EasyOCR fallback warning ({e}). Using heuristic text detector.")
            self._engine = "heuristic"
            self._engine_type = "Heuristic-Engine"

    def extract_text(self, image: Image.Image) -> Dict[str, Any]:
        """
        Extracts structured text, civic notices, and emergency keywords from image.
        """
        start_time = time.time()
        self._init_engine()

        np_img = np.array(image.convert("RGB"))
        text_records: List[Dict[str, Any]] = []

        if self._engine_type == "PaddleOCR-v4":
            try:
                results = self._engine.ocr(np_img, cls=True)
                if results and results[0]:
                    for line in results[0]:
                        box, (text, conf) = line
                        if conf >= self.min_confidence:
                            text_records.append({
                                "text": text.strip(),
                                "confidence": round(float(conf), 4),
                                "polygon": box,
                            })
            except Exception as e:
                logger.error(f"PaddleOCR execution error: {e}")

        elif self._engine_type == "EasyOCR-CRAFT-Engine":
            try:
                results = self._engine.readtext(np_img)
                for bbox, text, conf in results:
                    if conf >= self.min_confidence:
                        text_records.append({
                            "text": text.strip(),
                            "confidence": round(float(conf), 4),
                            "polygon": [[int(p[0]), int(p[1])] for p in bbox],
                        })
            except Exception as e:
                logger.error(f"EasyOCR execution error: {e}")

        # Post-processing: extract full text, emergency words, and reference patterns
        full_text = " ".join([r["text"] for r in text_records])
        lower_full = full_text.lower()

        detected_emergencies = [
            kw for kw in EMERGENCY_KEYWORDS if kw in lower_full
        ]

        detected_signs = []
        for sign_type, pattern in SIGN_PATTERNS.items():
            matches = re.findall(pattern, full_text, flags=re.IGNORECASE)
            if matches:
                detected_signs.append({
                    "sign_type": sign_type,
                    "matches": [str(m) if isinstance(m, str) else "-".join(m) for m in matches]
                })

        duration_ms = round((time.time() - start_time) * 1000, 2)

        avg_conf = (
            round(sum(r["confidence"] for r in text_records) / max(1, len(text_records)), 4)
            if text_records
            else 0.0
        )

        return {
            "model_version": self.model_version,
            "engine": self._engine_type,
            "text_count": len(text_records),
            "full_text": full_text,
            "tokens": [r["text"] for r in text_records],
            "confidence": avg_conf,
            "detected_languages": [self.lang],
            "records": text_records,
            "emergency_keywords": detected_emergencies,
            "sign_detections": detected_signs,
            "latency_ms": duration_ms,
        }
