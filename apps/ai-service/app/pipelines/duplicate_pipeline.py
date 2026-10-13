# ============================================================
# Civiora Duplicate Incident Retrieval Pipeline
# CLIP Cosine Similarity + Haversine Geodesic Distance
# ============================================================

import logging
from typing import List, Dict, Any, Tuple
from app.core.model_registry import model_registry

logger = logging.getLogger("civiora.ai.duplicates")


class DuplicatePipeline:
    """
    Ranks nearby incident candidates using visual semantics (CLIP)
    and geographic proximity (Haversine).
    """

    def __init__(self):
        self.registry = model_registry

    def evaluate_candidates(
        self,
        query_embedding: List[float],
        query_location: Tuple[float, float],  # [lng, lat]
        query_category: str,
        candidates: List[Dict[str, Any]],
        geo_radius_meters: float = 300.0,
        similarity_threshold: float = 0.65,
    ) -> Dict[str, Any]:
        """
        Executes multi-factor duplicate retrieval and candidate ranking.
        """
        scored = self.registry.clip.rank_duplicate_candidates(
            query_embedding=query_embedding,
            query_location=query_location,
            query_category=query_category,
            candidates=candidates,
            geo_radius_limit_meters=geo_radius_meters,
            similarity_threshold=similarity_threshold,
        )

        potential_duplicates = [c for c in scored if c["is_potential_duplicate"]]
        top_match = potential_duplicates[0] if potential_duplicates else None

        return {
            "has_potential_duplicates": bool(potential_duplicates),
            "match_count": len(potential_duplicates),
            "top_match_id": top_match["candidate_id"] if top_match else None,
            "top_match_score": top_match["composite_score"] if top_match else 0.0,
            "candidates_evaluated": len(candidates),
            "ranked_candidates": scored,
            "candidates": scored,
        }


duplicate_pipeline = DuplicatePipeline()
