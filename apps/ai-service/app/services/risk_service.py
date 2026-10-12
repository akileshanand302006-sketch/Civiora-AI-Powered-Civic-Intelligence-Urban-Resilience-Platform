# ============================================================
# Multi-Factor Municipal Risk Engine
# ============================================================

from datetime import datetime
from app.schemas.risk import RiskAssessmentRequest, RiskAssessmentResponse, RiskFactor


class RiskEngine:
    def evaluate_risk(self, req: RiskAssessmentRequest) -> RiskAssessmentResponse:
        score = 20
        factors = []

        # Category base risk
        if req.category in ["emergency_incident", "exposed_electrical_hazard", "flooding"]:
            cat_score = 40
            factors.append(
                RiskFactor(
                    factor="severe_hazard_class",
                    weight=0.4,
                    contribution=cat_score,
                    explanation=f"Category '{req.category}' presents immediate threat to urban safety",
                )
            )
            score += cat_score
        elif req.category in ["water_leakage", "drainage_blockage", "pothole"]:
            cat_score = 25
            factors.append(
                RiskFactor(
                    factor="infrastructure_degradation",
                    weight=0.25,
                    contribution=cat_score,
                    explanation="Requires rapid municipal intervention to prevent compounding asset loss",
                )
            )
            score += cat_score

        # Emergency Flag
        if req.is_emergency:
            factors.append(
                RiskFactor(
                    factor="emergency_sos_flag",
                    weight=0.35,
                    contribution=35.0,
                    explanation="Direct emergency distress priority override",
                )
            )
            score += 35

        # Nearby Vulnerable Sites (Schools, Hospitals)
        if req.nearby_vulnerable_sites:
            site_score = min(25, len(req.nearby_vulnerable_sites) * 12)
            factors.append(
                RiskFactor(
                    factor="vulnerable_zone_proximity",
                    weight=0.25,
                    contribution=float(site_score),
                    explanation=f"Located near critical urban infrastructure: {', '.join(req.nearby_vulnerable_sites)}",
                )
            )
            score += site_score

        # Weather Aggravator
        if req.weather_condition in ["rain", "storm", "flooding"]:
            factors.append(
                RiskFactor(
                    factor="weather_aggravation",
                    weight=0.15,
                    contribution=15.0,
                    explanation=f"Inclement weather ({req.weather_condition}) exacerbates physical damage propagation",
                )
            )
            score += 15

        # Historical Recurrence
        if req.historical_failure_count > 2:
            factors.append(
                RiskFactor(
                    factor="chronic_failure_cluster",
                    weight=0.1,
                    contribution=10.0,
                    explanation=f"Chronic failure hotspot ({req.historical_failure_count} previous occurrences)",
                )
            )
            score += 10

        final_score = min(100, max(5, int(score)))

        if final_score >= 80:
            level = "critical"
            recommended_priority = "critical"
            recommended_sla_hours = 2
        elif final_score >= 60:
            level = "high"
            recommended_priority = "high"
            recommended_sla_hours = 12
        elif final_score >= 35:
            level = "medium"
            recommended_priority = "medium"
            recommended_sla_hours = 48
        else:
            level = "low"
            recommended_priority = "low"
            recommended_sla_hours = 120

        return RiskAssessmentResponse(
            score=final_score,
            level=level,
            recommended_priority=recommended_priority,
            recommended_sla_hours=recommended_sla_hours,
            factors=factors,
            assessed_at=datetime.utcnow().isoformat(),
        )


risk_engine = RiskEngine()
