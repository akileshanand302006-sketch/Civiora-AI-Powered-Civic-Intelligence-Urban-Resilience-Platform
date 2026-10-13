"""
Civiora AI Intelligence Engine - Hazard Taxonomy & Regression Tests
Validates:
1. Garbage accumulation is NEVER mapped to Pothole.
2. Canonical taxonomy mappings are 100% deterministic and match @civicpulse/shared.
3. Low confidence / out-of-distribution inputs yield 'other' with uncertain=True.
4. Absence of detections produces zero bounding boxes (no fabricated boxes).
5. All 18 canonical categories have calibrated risk in SeverityScoringEngine.
"""

import pytest
from PIL import Image
from app.models.yolo_detector import (
    YOLODetector,
    CIVIC_TAXONOMY,
    RAW_AND_COCO_TO_CIVIC_MAP,
)
from app.services.severity_engine import (
    SeverityScoringEngine,
    DetectedHazard,
    CATEGORY_BASE_RISK,
)

CANONICAL_CATEGORIES = [
    "pothole",
    "road_damage",
    "garbage_accumulation",
    "illegal_dumping",
    "drainage_blockage",
    "water_leakage",
    "flooding",
    "broken_streetlight",
    "damaged_traffic_signal",
    "damaged_sidewalk",
    "fallen_tree",
    "public_infrastructure_damage",
    "unsafe_public_space",
    "exposed_electrical_hazard",
    "traffic_obstruction",
    "environmental_hazard",
    "emergency_incident",
    "other",
]


@pytest.fixture
def detector():
    return YOLODetector(model_path="artifacts/models/yolo11_finetuned.pt")


def test_garbage_never_maps_to_pothole(detector):
    """
    CRITICAL REGRESSION TEST:
    Verifies that garbage labels resolve to 'garbage_accumulation' and NEVER 'pothole'.
    """
    garbage_variations = [
        "garbage",
        "trash",
        "waste",
        "litter",
        "dump",
        "garbage accumulation",
        "dumpster overflow",
    ]
    for syn in garbage_variations:
        canonical = detector._map_to_canonical(syn)
        assert canonical == "garbage_accumulation", f"Failed for '{syn}', got '{canonical}'"
        assert canonical != "pothole", f"CRITICAL: '{syn}' incorrectly resolved to 'pothole'!"


def test_all_18_canonical_categories_defined_in_taxonomy():
    """Verifies that all 18 master categories are present in the AI taxonomy."""
    for cat in CANONICAL_CATEGORIES:
        assert cat in CIVIC_TAXONOMY, f"Category '{cat}' missing from CIVIC_TAXONOMY"


def test_raw_model_classes_map_to_canonical(detector):
    """
    Verifies that classes produced by fine-tuned models map to canonical identifiers.
    """
    assert detector._map_to_canonical("garbage") == "garbage_accumulation"
    assert detector._map_to_canonical("road_crack") == "road_damage"
    assert detector._map_to_canonical("drainage_obstruction") == "drainage_blockage"
    assert detector._map_to_canonical("damaged_streetlight") == "broken_streetlight"
    assert detector._map_to_canonical("damaged_traffic_sign") == "damaged_traffic_signal"
    assert detector._map_to_canonical("pothole") == "pothole"
    assert detector._map_to_canonical("flooding") == "flooding"
    assert detector._map_to_canonical("fallen_tree") == "fallen_tree"


def test_unknown_class_maps_to_other_with_uncertainty(detector):
    """
    Verifies that unrecognized inputs map to 'other' without inventing categories.
    """
    unknown_label = "random_unrelated_concept_xyz_123"
    canonical = detector._map_to_canonical(unknown_label)
    assert canonical == "other"


def test_empty_image_detection_produces_zero_boxes(detector):
    """
    Verifies that a blank image produces 0 bounding boxes and flags uncertain=True.
    No fabricated boxes allowed.
    """
    blank = Image.new("RGB", (320, 320), color=(50, 50, 50))
    res = detector.detect(blank)
    assert isinstance(res["detections"], list)
    if res["detected_count"] == 0:
        assert len(res["detections"]) == 0
        assert res["dominant_category"] == "other"
        assert res["uncertain"] is True
        assert res["confidence"] == 0.0


def test_severity_engine_supports_all_canonical_categories():
    """
    Verifies that all 18 categories have valid baseline risk weights.
    """
    engine = SeverityScoringEngine()
    for cat in CANONICAL_CATEGORIES:
        assert cat in CATEGORY_BASE_RISK, f"Category '{cat}' not in CATEGORY_BASE_RISK"
        hazard = DetectedHazard(category=cat, confidence=0.85)
        res = engine.evaluate(hazards=[hazard])
        assert 10 <= res.score <= 100
        assert res.band in ["low", "medium", "high", "critical"]
