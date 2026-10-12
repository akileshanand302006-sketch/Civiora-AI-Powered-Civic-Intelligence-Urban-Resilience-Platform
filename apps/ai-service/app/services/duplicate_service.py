# ============================================================
# Geospatial & Semantic Duplicate Detection Service
# ============================================================

import math
from typing import Tuple
from app.schemas.duplicates import (
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    DuplicateMatch,
)


def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """
    Computes geodesic distance between two [lng, lat] coordinates in meters.
    """
    lng1, lat1 = coord1
    lng2, lat2 = coord2
    R = 6371000  # Earth radius in meters

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def jaccard_similarity(text1: str, text2: str) -> float:
    """
    Token-level Jaccard similarity between two strings.
    """
    set1 = set(text1.lower().split())
    set2 = set(text2.lower().split())
    if not set1 or not set2:
        return 0.0
    return len(set1.intersection(set2)) / len(set1.union(set2))


class DuplicateService:
    def __init__(self, geo_radius_threshold: float = 150.0):
        self.geo_radius_threshold = geo_radius_threshold

    def evaluate_duplicates(self, req: DuplicateCheckRequest) -> DuplicateCheckResponse:
        matches = []
        is_cluster_duplicate = False
        master_id = None

        for cand in req.candidates:
            # Check category compatibility
            if cand.category != req.category:
                continue

            # Compute geodesic distance
            dist = haversine_distance(req.coordinates, cand.coordinates)

            if dist <= self.geo_radius_threshold:
                # Same category and within proximity radius
                text_sim = jaccard_similarity(req.title, cand.title)

                # Proximity score (1.0 at 0m, 0.5 at threshold)
                dist_score = max(0.0, 1.0 - (dist / (self.geo_radius_threshold * 2)))

                overall_conf = round((dist_score * 0.6) + (text_sim * 0.4), 2)

                is_dup = overall_conf >= 0.65 or dist <= 40.0

                if is_dup:
                    is_cluster_duplicate = True
                    if not master_id:
                        master_id = cand.id

                matches.append(
                    DuplicateMatch(
                        incident_id=cand.id,
                        incident_number=cand.incident_number,
                        distance_meters=round(dist, 1),
                        semantic_similarity=round(text_sim, 2),
                        overall_confidence=overall_conf,
                        is_duplicate=is_dup,
                    )
                )

        return DuplicateCheckResponse(
            is_duplicate=is_cluster_duplicate,
            cluster_master_id=master_id,
            matches=matches,
            total_candidates_evaluated=len(req.candidates),
        )


duplicate_service = DuplicateService()
