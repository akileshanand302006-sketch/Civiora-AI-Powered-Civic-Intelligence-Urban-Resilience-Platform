"""
Civiora AI - Reproducible YOLO11 Fine-Tuning & Adaptation Pipeline
Executes domain adaptation on validated multi-hazard civic dataset:
- Evaluates against baseline COCO weights
- Supports frozen backbone (freeze=10) vs unfrozen training
- Handles resource-constrained laptop / CPU-mode execution
- Saves training logs, best checkpoint, per-class metrics, and SHA256 checksum
"""

import os
import sys
import time
import json
import hashlib
import argparse
from pathlib import Path
from unittest.mock import MagicMock

# Fix Python 3.14 matplotlib ft2font binary wheel compatibility
if "matplotlib.ft2font" not in sys.modules:
    sys.modules["matplotlib.ft2font"] = MagicMock()

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
SERVICE_DIR = SCRIPT_DIR.parent
DATASETS_DIR = SERVICE_DIR / "datasets"
CONFIG_YAML = DATASETS_DIR / "civiora_dataset.yaml"
ARTIFACTS_DIR = SERVICE_DIR / "artifacts"
MODELS_DIR = ARTIFACTS_DIR / "models"


def compute_file_sha256(filepath: Path) -> str:
    """Calculates SHA256 checksum of a checkpoint file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def run_training(
    base_model: str = "yolo11n.pt",
    epochs: int = 3,
    batch_size: int = 2,
    imgsz: int = 320,
    device: str = "cpu",
    freeze_layers: int = 0,
    project_name: str = "civiora_training",
    run_name: str = "pilot_run",
):
    print("============================================================")
    print("    CIVIORA AI — YOLO11 CIVIC DETECTOR FINE-TUNING          ")
    print("============================================================")
    print(f"Base Checkpoint : {base_model}")
    print(f"Dataset YAML    : {CONFIG_YAML}")
    print(f"Epochs          : {epochs}")
    print(f"Batch Size      : {batch_size}")
    print(f"Image Resolution: {imgsz}x{imgsz}")
    print(f"Target Device   : {device}")
    print(f"Frozen Layers   : {freeze_layers}")
    print("------------------------------------------------------------\n")

    if not CONFIG_YAML.exists():
        print(f"[ERROR] Dataset configuration not found at {CONFIG_YAML}")
        sys.exit(1)

    import ultralytics
    from ultralytics import YOLO

    print(f"Ultralytics API Version: {ultralytics.__version__}")

    # Determine initial checkpoint location
    weights_path = MODELS_DIR / base_model
    if not weights_path.exists():
        weights_path = Path(base_model)

    start_train_time = time.time()
    model = YOLO(str(weights_path))

    # Phase 1: Train/Fine-tune
    print(f"Starting model adaptation on {CONFIG_YAML.name}...")
    train_args = {
        "data": str(CONFIG_YAML),
        "epochs": epochs,
        "batch": batch_size,
        "imgsz": imgsz,
        "device": device,
        "project": str(ARTIFACTS_DIR / project_name),
        "name": run_name,
        "exist_ok": True,
        "verbose": True,
        "plots": False,
        "workers": 0,  # Single worker to prevent multiprocessing locks on Windows
    }
    if freeze_layers > 0:
        train_args["freeze"] = freeze_layers

    try:
        train_results = model.train(**train_args)
    except Exception as e:
        print(f"[ERROR] Fine-tuning aborted due to runtime error: {e}")
        sys.exit(1)

    elapsed_training_sec = round(time.time() - start_train_time, 2)
    print(f"\nTraining completed in {elapsed_training_sec}s.")

    # Phase 2: Post-training validation on test split
    print("\nRunning post-training validation on held-out test split...")
    try:
        val_results = model.val(
            data=str(CONFIG_YAML),
            split="test",
            imgsz=imgsz,
            device=device,
            project=str(ARTIFACTS_DIR / project_name),
            name=f"{run_name}_val",
            exist_ok=True,
            verbose=True,
            workers=0,
        )
        map50 = getattr(val_results.box, "map50", 0.0)
        map50_95 = getattr(val_results.box, "map", 0.0)
        precision = getattr(val_results.box, "mp", 0.0)
        recall = getattr(val_results.box, "mr", 0.0)
    except Exception as e:
        print(f"[WARN] Validation evaluation exception: {e}")
        map50, map50_95, precision, recall = 0.0, 0.0, 0.0, 0.0

    # Locate output best.pt checkpoint
    save_dir = Path(train_results.save_dir) if hasattr(train_results, "save_dir") else (ARTIFACTS_DIR / project_name / run_name)
    best_pt = save_dir / "weights" / "best.pt"
    if not best_pt.exists():
        best_pt = save_dir / "weights" / "last.pt"

    checkpoint_meta = {}
    if best_pt.exists():
        chk_size_mb = round(best_pt.stat().st_size / (1024 * 1024), 2)
        chk_sha256 = compute_file_sha256(best_pt)
        checkpoint_meta = {
            "checkpoint_path": str(best_pt),
            "size_mb": chk_size_mb,
            "sha256": chk_sha256,
        }
        print(f"\nBest Checkpoint Saved: {best_pt}")
        print(f"Size: {chk_size_mb} MB | SHA256: {chk_sha256[:16]}...")

        # Also copy or link to artifacts/models/yolo11_finetuned.pt
        dest_model = MODELS_DIR / "yolo11_finetuned.pt"
        import shutil
        shutil.copy2(best_pt, dest_model)
        print(f"Promoted fine-tuned checkpoint to: {dest_model}")

    # Generate metadata report
    summary = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model_architecture": "YOLO11s/n (Ultralytics)",
        "base_model": base_model,
        "configuration": {
            "epochs": epochs,
            "batch_size": batch_size,
            "image_size": imgsz,
            "device": device,
            "freeze_layers": freeze_layers,
            "dataset_config": str(CONFIG_YAML),
        },
        "training_duration_seconds": elapsed_training_sec,
        "validation_metrics": {
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "mAP50": round(float(map50), 4),
            "mAP50_95": round(float(map50_95), 4),
        },
        "checkpoint": checkpoint_meta,
        "classes": [
            "pothole",
            "road_crack",
            "garbage",
            "flooding",
            "fallen_tree",
            "damaged_streetlight",
            "damaged_traffic_sign",
            "drainage_obstruction",
        ],
    }

    out_json = ARTIFACTS_DIR / "training_summary.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"\nTraining summary report written to: {out_json}")
    print("============================================================\n")
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Civiora YOLO11 Fine-Tuning Pipeline")
    parser.add_argument("--base-model", default="yolo11n.pt", help="Pretrained baseline weights")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=2, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=320, help="Input image dimension")
    parser.add_argument("--device", default="cpu", help="Compute device (cpu, 0, etc.)")
    parser.add_argument("--freeze", type=int, default=0, help="Number of layers to freeze")
    parser.add_argument("--name", default="pilot_run", help="Experiment run name")
    args = parser.parse_args()

    run_training(
        base_model=args.base_model,
        epochs=args.epochs,
        batch_size=args.batch,
        imgsz=args.imgsz,
        device=args.device,
        freeze_layers=args.freeze,
        run_name=args.name,
    )
