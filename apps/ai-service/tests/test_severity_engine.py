# ============================================================
# Unit Tests for Civiora Explainable Severity Scoring Engine
# ============================================================

import pytest
from app.services.severity_engine import (
    SeverityScoringEngine,
    DetectedHazard,
    BoundingBox,
    compute_bbox_union_area,
)


def test_empty_hazards_returns_low_severity():
    engine = SeverityScoringEngine()
    res = engine.evaluate(hazards=[])
    assert res.score == 10
    assert res.band == "low"
    assert res.review_required is False


def test_pothole_single_moderate_extent():
    engine = SeverityScoringEngine()
    hazard = DetectedHazard(
        category="pothole",
        confidence=0.88,
        box=BoundingBox(x_min=0.2, y_min=0.3, x_max=0.6, y_max=0.7),
    )
    res = engine.evaluate(hazards=[hazard])
    assert 35 <= res.score <= 75
    assert res.band in ["medium", "high"]
    assert res.contributing_factors["primary_category"] == "pothole"


def test_severe_flooding_with_high_segmentation_triggers_critical():
    engine = SeverityScoringEngine()
    hazard = DetectedHazard(
        category="flooding",
        confidence=0.92,
        box=BoundingBox(x_min=0.0, y_min=0.2, x_max=1.0, y_max=0.9),
    )
    res = engine.evaluate(
        hazards=[hazard],
        segmentation_coverage_pct=32.0,
        emergency_keywords=["FLOOD DANGER"],
    )
    assert res.score >= 80
    assert res.band == "critical"
    assert res.review_required is True


def test_bbox_union_prevents_double_counting_identical_boxes():
    box1 = BoundingBox(x_min=0.1, y_min=0.1, x_max=0.5, y_max=0.5)
    box2 = BoundingBox(x_min=0.1, y_min=0.1, x_max=0.5, y_max=0.5)  # Identical box
    union = compute_bbox_union_area([box1, box2])
    single = compute_bbox_union_area([box1])
    assert abs(union - single) < 0.05  # Should not be double!


def test_low_confidence_flags_review_required():
    engine = SeverityScoringEngine()
    hazard = DetectedHazard(
        category="damaged_streetlight",
        confidence=0.42,  # Low confidence
        box=BoundingBox(x_min=0.4, y_min=0.1, x_max=0.6, y_max=0.5),
    )
    res = engine.evaluate(hazards=[hazard])
    assert res.review_required is True
    assert any("below confidence threshold" in r for r in res.reasons)
