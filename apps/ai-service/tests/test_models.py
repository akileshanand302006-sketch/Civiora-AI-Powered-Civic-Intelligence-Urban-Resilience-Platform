"""
Civiora AI Engine - Unit Tests for all 5 Model Adapters
Tests YOLO11, OCREngine, QwenVLEngine, CLIPEmbeddingEngine, and DamageSegmentationEngine.
"""

import pytest
from PIL import Image
from app.core.model_registry import model_registry


@pytest.fixture
def test_image():
    return Image.new("RGB", (640, 640), color=(120, 120, 120))


def test_yolo_detector(test_image):
    detector = model_registry.detector
    res = detector.detect(test_image)

    assert "model_version" in res
    assert "detected_count" in res
    assert "dominant_category" in res
    assert "detections" in res
    assert "latency_ms" in res
    assert isinstance(res["detections"], list)


def test_ocr_engine(test_image):
    ocr = model_registry.ocr
    res = ocr.extract_text(test_image)

    assert "full_text" in res
    assert "tokens" in res
    assert "confidence" in res
    assert "detected_languages" in res
    assert isinstance(res["tokens"], list)


def test_qwen_vl_engine(test_image):
    qwen = model_registry.qwen_vl
    res = qwen.describe_scene(test_image, detected_category="pothole")

    assert "model_version" in res
    assert "structured_output" in res
    struct = res["structured_output"]
    assert "image_description" in struct
    assert "possible_civic_category" in struct
    assert "visible_evidence" in struct
    assert "uncertainty_score" in struct
    assert 0.0 <= struct["uncertainty_score"] <= 1.0


def test_clip_embeddings(test_image):
    clip = model_registry.clip
    res = clip.embed_image(test_image)

    assert "embedding" in res
    assert res["dimensions"] == 512
    assert len(res["embedding"]) == 512
    # Verify L2 normalization
    norm = sum(x * x for x in res["embedding"]) ** 0.5
    assert abs(norm - 1.0) < 0.05


def test_damage_segmentation(test_image):
    seg = model_registry.segmentation
    res = seg.segment_damage(test_image)

    assert "model_version" in res
    assert "total_damage_coverage_pct" in res
    assert "segments" in res
    assert "latency_ms" in res
    assert 0.0 <= res["total_damage_coverage_pct"] <= 100.0
