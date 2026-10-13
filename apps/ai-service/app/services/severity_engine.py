# ============================================================
# Civiora Explainable Severity Scoring Engine
# Multi-Factor Visual Hazard Scoring + Union-Area Extent
# Uncertainty Calibration + Transparent Governance Policy
# ============================================================

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x_min: float = Field(..., ge=0.0, le=1.0)
    y_min: float = Field(..., ge=0.0, le=1.0)
    x_max: float = Field(..., ge=0.0, le=1.0)
    y_max: float = Field(..., ge=0.0, le=1.0)


class DetectedHazard(BaseModel):
    category: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    box: Optional[BoundingBox] = None
    source_model: str = "yolo11"


class SeverityAssessmentResult(BaseModel):
    score: int = Field(..., ge=0, le=100)
    band: str  # 'low' | 'medium' | 'high' | 'critical'
    policy_version: str = "civiora-severity-policy-v1"
    review_required: bool
    reasons: List[str]
    contributing_factors: Dict[str, Any]
    disclaimer: str = "AI-generated recommendation for municipal triaging; subject to field officer confirmation."


# Baseline category risk weights (0 to 100)
# Calibrated against municipal triaging guidelines and physical hazard impact
CATEGORY_BASE_RISK = {
    "emergency_incident": 95,
    "exposed_electrical_hazard": 88,
    "flooding": 78,
    "fallen_tree": 72,
    "water_leakage": 62,
    "water_leak": 62,  # legacy alias
    "drainage_blockage": 60,
    "drainage_obstruction": 60,  # legacy alias
    "environmental_hazard": 58,
    "unsafe_public_space": 55,
    "pothole": 54,
    "traffic_obstruction": 52,
    "public_infrastructure_damage": 50,
    "illegal_dumping": 48,
    "garbage_accumulation": 42,
    "garbage": 42,  # legacy alias
    "damaged_traffic_signal": 40,
    "damaged_traffic_sign": 40,  # legacy alias
    "broken_streetlight": 36,
    "damaged_streetlight": 36,  # legacy alias
    "road_damage": 34,
    "road_crack": 32,  # legacy alias
    "damaged_sidewalk": 30,
    "other": 20,
}


def compute_bbox_union_area(boxes: List[BoundingBox], grid_size: int = 40) -> float:
    """
    Computes normalized union area of bounding boxes on a discrete grid,
    correctly preventing double-counting of overlapping detections.
    """
    if not boxes:
        return 0.0

    occupied_cells = set()
    for box in boxes:
        col_start = int(box.x_min * grid_size)
        col_end = min(grid_size, int(box.x_max * grid_size) + 1)
        row_start = int(box.y_min * grid_size)
        row_end = min(grid_size, int(box.y_max * grid_size) + 1)

        for r in range(row_start, row_end):
            for c in range(col_start, col_end):
                occupied_cells.add((r, c))

    return round(len(occupied_cells) / (grid_size * grid_size), 4)


class SeverityScoringEngine:
    """
    Independent, testable, explainable civic hazard severity scoring engine.
    Synthesizes category baseline risk, bounded visual extent, spatial density,
    confidence calibration, and emergency escalation.
    """

    def __init__(self, policy_version: str = "civiora-severity-policy-v1"):
        self.policy_version = policy_version

    def evaluate(
        self,
        hazards: List[DetectedHazard],
        segmentation_coverage_pct: Optional[float] = None,
        emergency_keywords: Optional[List[str]] = None,
        is_zero_shot: bool = False,
    ) -> SeverityAssessmentResult:
        reasons: List[str] = []
        review_required = False

        if not hazards:
            return SeverityAssessmentResult(
                score=10,
                band="low",
                policy_version=self.policy_version,
                review_required=False,
                reasons=["No active municipal hazards detected in photographic evidence."],
                contributing_factors={"hazard_count": 0, "base_risk": 10},
            )

        # 1. Primary Category & Base Risk
        sorted_hazards = sorted(hazards, key=lambda h: (CATEGORY_BASE_RISK.get(h.category, 20), h.confidence), reverse=True)
        primary = sorted_hazards[0]
        base_risk = CATEGORY_BASE_RISK.get(primary.category, 25)
        reasons.append(f"Primary hazard identified as '{primary.category}' (Baseline risk: {base_risk}/100)")

        # 2. Visual Extent Contribution
        visual_extent_score = 0.0
        extent_explanation = ""

        if segmentation_coverage_pct is not None and segmentation_coverage_pct > 0.0:
            # Segmentation-derived pixel coverage
            visual_extent_score = min(35.0, round(segmentation_coverage_pct * 1.6, 2))
            extent_explanation = f"Damage pixel segmentation mask covers {segmentation_coverage_pct:.1f}% of image frame (+{visual_extent_score:.1f} pts)"
        else:
            # Bounding box union area calculation
            valid_boxes = [h.box for h in hazards if h.box is not None]
            if valid_boxes:
                union_area = compute_bbox_union_area(valid_boxes)
                visual_extent_score = min(30.0, round(union_area * 55.0, 2))
                extent_explanation = f"Bounding box union occupies {union_area * 100:.1f}% of scene (+{visual_extent_score:.1f} pts)"

        if extent_explanation:
            reasons.append(extent_explanation)

        # 3. Multi-Hazard Density Contribution
        density_score = 0.0
        if len(hazards) > 1:
            distinct_cats = {h.category for h in hazards}
            density_score = min(15.0, (len(hazards) - 1) * 3.5 + (len(distinct_cats) - 1) * 4.0)
            reasons.append(f"Scene contains {len(hazards)} hazard clusters across {len(distinct_cats)} categories (+{density_score:.1f} density pts)")

        # 4. Emergency Keyword Escalation
        escalation_score = 0.0
        if emergency_keywords:
            escalation_score = min(20.0, len(emergency_keywords) * 10.0)
            reasons.append(f"Critical keywords recognized in nearby signage: {', '.join(emergency_keywords)} (+{escalation_score:.1f} pts)")

        # 5. Model Confidence Calibration
        avg_confidence = sum(h.confidence for h in hazards) / len(hazards)
        if avg_confidence < 0.60:
            review_required = True
            reasons.append(f"Detection confidence ({avg_confidence:.2f}) is below confidence threshold; flagged for verification")

        if is_zero_shot:
            review_required = True
            reasons.append("Open-vocabulary zero-shot candidate detected; human confirmation required")

        # 6. Composite Score Calculation
        # Weighted combination: 50% base risk + 30% visual extent + 10% density + 10% escalation
        composite_raw = (base_risk * 0.50) + visual_extent_score + density_score + escalation_score
        final_score = int(min(100, max(5, round(composite_raw))))

        # 7. Severity Banding
        if final_score >= 80:
            band = "critical"
            review_required = True  # All critical incidents mandate review
            reasons.append("Critical risk threshold reached; automated escalation to emergency dispatch")
        elif final_score >= 60:
            band = "high"
        elif final_score >= 35:
            band = "medium"
        else:
            band = "low"

        return SeverityAssessmentResult(
            score=final_score,
            band=band,
            policy_version=self.policy_version,
            review_required=review_required,
            reasons=reasons,
            contributing_factors={
                "primary_category": primary.category,
                "base_risk": base_risk,
                "visual_extent_score": visual_extent_score,
                "density_score": density_score,
                "escalation_score": escalation_score,
                "hazard_count": len(hazards),
                "avg_confidence": round(avg_confidence, 4),
            },
        )


# Global singleton instance
severity_engine = SeverityScoringEngine()
