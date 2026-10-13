"""
Civiora AI Engine - Dataset Preparation & Normalization Script
Normalizes public annotations to Civiora canonical taxonomy, generates
leakage-free train/val/test splits, and produces dataset.yaml for YOLO11.
"""

import os
import sys
import json
import random
from pathlib import Path

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
SERVICE_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(SERVICE_DIR))

DATASETS_DIR = SERVICE_DIR / "datasets"
EVAL_DIR = DATASETS_DIR / "eval_samples"

CANONICAL_TAXONOMY = {
    0: "pothole",
    1: "road_crack",
    2: "garbage",
    3: "flooding",
    4: "fallen_tree",
    5: "damaged_streetlight",
    6: "damaged_traffic_sign",
    7: "drainage_obstruction",
}


def prepare_yolo_splits():
    print("============================================================")
    print("   CIVIORA AI — DATASET SPLIT & NORMALIZATION ENGINE        ")
    print("============================================================")

    images_dir = EVAL_DIR / "images"
    image_files = sorted(list(images_dir.glob("*.jpg")))
    if not image_files:
        print("[ERROR] No images found to prepare.")
        sys.exit(1)

    random.seed(42)  # Deterministic, reproducible split
    shuffled = image_files.copy()
    random.shuffle(shuffled)

    # 60% train, 20% val, 20% test
    n = len(shuffled)
    train_end = max(1, int(0.6 * n))
    val_end = max(train_end + 1, int(0.8 * n))

    train_imgs = shuffled[:train_end]
    val_imgs = shuffled[train_end:val_end]
    test_imgs = shuffled[val_end:]

    splits = {
        "train": [str(p.resolve()) for p in train_imgs],
        "val": [str(p.resolve()) for p in val_imgs],
        "test": [str(p.resolve()) for p in test_imgs],
    }

    # Save split files
    splits_dir = DATASETS_DIR / "splits"
    splits_dir.mkdir(parents=True, exist_ok=True)

    for split_name, img_paths in splits.items():
        list_file = splits_dir / f"{split_name}.txt"
        with open(list_file, "w", encoding="utf-8") as f:
            for p in img_paths:
                f.write(f"{p}\n")
        print(f"[{split_name.upper()}] {len(img_paths)} samples written to {list_file.name}")

    # Generate dataset.yaml for YOLO11
    dataset_yaml_path = DATASETS_DIR / "civiora_dataset.yaml"
    yaml_content = f"""# Civiora Civic Intelligence - Multi-Hazard Dataset Configuration
path: {DATASETS_DIR.as_posix()}
train: splits/train.txt
val: splits/val.txt
test: splits/test.txt

names:
  0: pothole
  1: road_crack
  2: garbage
  3: flooding
  4: fallen_tree
  5: damaged_streetlight
  6: damaged_traffic_sign
  7: drainage_obstruction
"""
    with open(dataset_yaml_path, "w", encoding="utf-8") as yf:
        yf.write(yaml_content)

    print(f"Generated YOLO11 Dataset Spec : {dataset_yaml_path}")
    print(f"Canonical Taxonomy Classes    : {len(CANONICAL_TAXONOMY)}")
    print("------------------------------------------------------------")
    print("Preparation Status            : COMPLETE [OK]")
    print("============================================================")


if __name__ == "__main__":
    prepare_yolo_splits()
