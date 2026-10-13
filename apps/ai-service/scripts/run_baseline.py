"""
Civiora AI Engine - YOLO11 Pretrained Baseline Runner
Runs pretrained YOLO11 on representative civic hazard images,
records class predictions, confidences, bounding boxes, latencies,
and saves baseline report to artifacts/baseline_predictions.json.
"""

import json
import time
from pathlib import Path
from PIL import Image
from ultralytics import YOLO

def main():
    service_dir = Path(__file__).resolve().parent.parent
    img_dir = service_dir / "datasets" / "eval_samples" / "images"
    out_dir = service_dir / "artifacts"
    model_path = service_dir / "artifacts" / "models" / "yolo11n.pt"

    print("=" * 60)
    print("  CIVIORA AI — PRETRAINED YOLO11 BASELINE BENCHMARK")
    print("=" * 60)
    print(f"Model Path : {model_path}")
    print(f"Images Dir : {img_dir}\n")

    if not model_path.exists():
        print(f"[ERROR] Model file not found: {model_path}")
        return

    model = YOLO(str(model_path))

    images = sorted(list(img_dir.glob("*.jpg")))
    print(f"Loaded {len(images)} representative civic test images.\n")

    results = []
    latencies = []

    for img_path in images:
        im = Image.open(img_path).convert("RGB")
        w, h = im.size

        t0 = time.perf_counter()
        pred = model.predict(im, conf=0.20, verbose=False)[0]
        lat_ms = (time.perf_counter() - t0) * 1000.0
        latencies.append(lat_ms)

        dets = []
        for b in pred.boxes:
            cls_id = int(b.cls[0].item())
            conf = float(b.conf[0].item())
            raw_label = pred.names.get(cls_id, f"class_{cls_id}")
            xyxy = [round(float(coord), 2) for coord in b.xyxy[0].tolist()]

            # Normalized bounding box coordinates [x_min, y_min, x_max, y_max]
            norm_box = {
                "x_min": round(max(0.0, min(1.0, xyxy[0] / w)), 4),
                "y_min": round(max(0.0, min(1.0, xyxy[1] / h)), 4),
                "x_max": round(max(0.0, min(1.0, xyxy[2] / w)), 4),
                "y_max": round(max(0.0, min(1.0, xyxy[3] / h)), 4),
            }
            norm_box["width"] = round(norm_box["x_max"] - norm_box["x_min"], 4)
            norm_box["height"] = round(norm_box["y_max"] - norm_box["y_min"], 4)
            norm_box["box_area_ratio"] = round(norm_box["width"] * norm_box["height"], 4)

            dets.append({
                "class_id": cls_id,
                "raw_label": raw_label,
                "confidence": round(conf, 4),
                "bbox_pixels": xyxy,
                "bbox_normalized": norm_box,
            })

        class_summary = [f"{d['raw_label']} ({d['confidence']:.2f})" for d in dets]
        print(f"[{img_path.name}] {len(dets)} detections in {lat_ms:.1f}ms: {class_summary or 'No detections'}")

        results.append({
            "image_filename": img_path.name,
            "image_width": w,
            "image_height": h,
            "latency_ms": round(lat_ms, 2),
            "detections_count": len(dets),
            "detections": dets,
        })

    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
    total_detections = sum(r["detections_count"] for r in results)

    baseline_report = {
        "benchmark_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model": {
            "name": "YOLO11n (Pretrained COCO baseline)",
            "checkpoint": str(model_path.name),
            "input_size": 640,
            "conf_threshold": 0.20,
        },
        "summary": {
            "total_images": len(images),
            "total_detections": total_detections,
            "avg_latency_ms": round(avg_latency, 2),
            "device": "CPU",
        },
        "predictions": results,
    }

    out_file = out_dir / "baseline_predictions.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(baseline_report, f, indent=2)

    print("\n" + "=" * 60)
    print(f"Total Detections : {total_detections}")
    print(f"Average Latency  : {avg_latency:.2f} ms")
    print(f"Report Saved To  : {out_file}")
    print("=" * 60)

if __name__ == "__main__":
    main()
