"""
Civiora AI Engine - FastAPI Integration Tests
Verifies health probes, model status, and all dedicated model endpoints.
"""

import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture
def sample_image_bytes():
    im = Image.new("RGB", (320, 320), color=(100, 100, 100))
    buf = io.BytesIO()
    im.save(buf, format="JPEG")
    return buf.getvalue()


def test_liveness_probe():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "civiora" in data["service"]


def test_readiness_probe():
    res = client.get("/health/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["ready"] is True
    assert "storage" in data
    assert "models" in data
    assert "yolo11" in data["models"]
    assert "ocr" in data["models"]
    assert "qwen2_5_vl" in data["models"]
    assert "clip" in data["models"]
    assert "segmentation" in data["models"]


def test_models_metadata_endpoint():
    res = client.get("/api/v1/ai/models")
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert "models" in body["data"]
    models = body["data"]["models"]
    assert models["yolo11"]["family"] == "YOLO11"
    assert models["ocr"]["family"] == "PaddleOCR"
    assert models["qwen2_5_vl"]["family"] == "Qwen2.5-VL"
    assert models["clip"]["family"] == "CLIP"
    assert models["segmentation"]["family"] == "YOLO11-seg"


def test_detect_civic_issues_endpoint(sample_image_bytes):
    res = client.post(
        "/api/v1/ai/detect-civic-issues",
        files={"file": ("test.jpg", sample_image_bytes, "image/jpeg")},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "dominant_category" in data["data"]
    assert "detections" in data["data"]


def test_extract_text_endpoint(sample_image_bytes):
    res = client.post(
        "/api/v1/ai/extract-text",
        files={"file": ("test.jpg", sample_image_bytes, "image/jpeg")},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "full_text" in data["data"]
    assert "tokens" in data["data"]


def test_describe_image_endpoint(sample_image_bytes):
    res = client.post(
        "/api/v1/ai/describe-image",
        files={"file": ("test.jpg", sample_image_bytes, "image/jpeg")},
        data={"hint_category": "pothole"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    scene = data["data"]
    assert "structured_output" in scene
    struct = scene["structured_output"]
    assert "image_description" in struct
    assert "possible_civic_category" in struct
    assert "visible_evidence" in struct
    assert "uncertainty_score" in struct


def test_embed_image_endpoint(sample_image_bytes):
    res = client.post(
        "/api/v1/ai/embed-image",
        files={"file": ("test.jpg", sample_image_bytes, "image/jpeg")},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["dimensions"] == 512
    assert len(data["data"]["embedding"]) == 512


def test_segment_damage_endpoint(sample_image_bytes):
    res = client.post(
        "/api/v1/ai/segment-damage",
        files={"file": ("test.jpg", sample_image_bytes, "image/jpeg")},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "total_damage_coverage_pct" in data["data"]
    assert "segments" in data["data"]


def test_find_similar_incidents():
    payload = {
        "query_category": "pothole",
        "query_coordinates": [80.2707, 13.0827],  # Chennai
        "query_embedding": [0.05] * 512,
        "candidates": [
            {
                "incident_id": "INC-001",
                "category": "pothole",
                "coordinates": [80.2710, 13.0830],
                "embedding": [0.05] * 512,
                "created_at": "2026-10-13T10:00:00Z",
            },
            {
                "incident_id": "INC-002",
                "category": "garbage",
                "coordinates": [76.9558, 11.0168],  # Coimbatore (far)
                "embedding": [-0.05] * 512,
                "created_at": "2026-10-10T10:00:00Z",
            },
        ],
        "geo_radius_meters": 500.0,
        "similarity_threshold": 0.65,
    }
    res = client.post("/api/v1/ai/find-similar-incidents", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["data"]["candidates"]) > 0
    # INC-001 should rank highest due to close proximity and identical embedding
    assert data["data"]["candidates"][0]["incident_id"] == "INC-001"
