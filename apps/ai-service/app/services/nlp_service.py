# ============================================================
# NLP Semantic Extraction Service
# ============================================================

import re
from app.schemas.nlp import NLPAnalysisRequest, NLPExtractionResult


class NLPService:
    def __init__(self):
        self.category_keywords = {
            "pothole": ["pothole", "crater", "hole", "cavity", "asphalt", "bump", "tyre damage"],
            "water_leakage": ["water", "leak", "pipe", "burst", "pipeline", "gushing", "tap", "overflow"],
            "broken_streetlight": ["light", "streetlight", "lamp", "dark", "illumination", "bulb", "flicker"],
            "garbage_accumulation": ["garbage", "trash", "waste", "rubbish", "dump", "stench", "litter"],
            "drainage_blockage": ["drain", "drainage", "clog", "sewage", "gutter", "manhole", "backing up"],
            "fallen_tree": ["tree", "branch", "trunk", "fallen", "uprooted", "blocking"],
            "emergency_incident": ["fire", "hazard", "gas", "collapse", "danger", "casualty", "electrocution", "sparks"],
        }

    def analyze_text(self, request: NLPAnalysisRequest) -> NLPExtractionResult:
        full_text = f"{request.title} {request.description}".lower()

        # Category determination
        best_cat = request.reported_category or "pothole"
        best_matches = 0

        for cat, keywords in self.category_keywords.items():
            matches = sum(1 for kw in keywords if kw in full_text)
            if matches > best_matches:
                best_matches = matches
                best_cat = cat

        confidence = min(0.98, max(0.72, 0.70 + (best_matches * 0.08)))

        # Urgency & Sentiment
        is_emergency_word = any(
            w in full_text for w in ["urgent", "emergency", "danger", "fatal", "immediately", "accident"]
        )
        urgency = "critical" if is_emergency_word else "high" if best_matches >= 3 else "medium"
        sentiment = "alarmed" if is_emergency_word else "frustrated"

        # Key entities extraction
        entities = []
        # Match road / sector names
        locations = re.findall(r"(sector\s+\d+|cross\s+road|main\s+road|avenue|street|circle)", full_text)
        entities.extend(list(set(locations)))

        hazards = []
        if "water" in full_text or "flood" in full_text:
            hazards.append("Localized Hydro-planing & Slipping Hazard")
        if "traffic" in full_text or "car" in full_text or "vehicle" in full_text:
            hazards.append("Traffic Flow Disruption")
        if "pedestrian" in full_text or "school" in full_text:
            hazards.append("Pedestrian Safety Threat")

        return NLPExtractionResult(
            predicted_category=best_cat,
            category_confidence=round(confidence, 2),
            urgency_level=urgency,
            sentiment=sentiment,
            key_entities=entities or ["Public Right of Way"],
            identified_issue=request.title,
            assessed_impact="Impedes municipal transit and poses safety risk to local residents",
            potential_hazards=hazards or ["Infrastructure Deterioration"],
            model_version="CivicPulse-Transformer-NLP-v2.1",
        )


nlp_service = NLPService()
