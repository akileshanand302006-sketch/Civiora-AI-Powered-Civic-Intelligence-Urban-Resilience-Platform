"""
Civiora AI Engine - Dataset Validation Script
Audits image integrity, bounding box validity, segmentation mask dimensions,
and class distributions across the dataset repository.
"""

import os
import sys
import json
import hashlib
from pathlib import Path
from PIL import Image

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
SERVICE_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(SERVICE_DIR))

DATASETS_DIR = SERVICE_DIR / "datasets"


def compute_md5(file_path: Path) -> str:
    h = hashlib.md5()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


def validate_all_datasets():
    print("============================================================")
    print("   CIVIORA AI — DATASET INTEGRITY & VALIDATION SUITE        ")
    print("============================================================")

    total_images = 0
    valid_images = 0
    corrupt_images = 0
    valid_bboxes = 0
    invalid_bboxes = 0
    valid_masks = 0
    invalid_masks = 0

    hashes_seen = {}
    duplicates = []
    class_distribution = {}

    eval_samples = DATASETS_DIR / "eval_samples"
    if not eval_samples.exists():
        print("[ERROR] Datasets directory not found. Run download_datasets.py first.")
        sys.exit(1)

    images_dir = eval_samples / "images"
    labels_dir = eval_samples / "labels"
    masks_dir = eval_samples / "masks"

    for img_path in images_dir.glob("*.jpg"):
        total_images += 1
        # 1. Image Check
        try:
            with Image.open(img_path) as im:
                im.verify()
            with Image.open(img_path) as im:
                w, h = im.size
                channels = len(im.getbands())
                if w <= 0 or h <= 0 or channels != 3:
                    corrupt_images += 1
                    print(f"[FAIL] Invalid image dimensions or bands: {img_path.name}")
                    continue
                valid_images += 1
        except Exception as e:
            corrupt_images += 1
            print(f"[FAIL] Corrupt image {img_path.name}: {e}")
            continue

        # 2. Hash Deduplication Check
        img_hash = compute_md5(img_path)
        if img_hash in hashes_seen:
            duplicates.append((img_path.name, hashes_seen[img_hash]))
        else:
            hashes_seen[img_hash] = img_path.name

        # 3. Bounding Box Annotation Check
        lbl_path = labels_dir / f"{img_path.stem}.txt"
        if lbl_path.exists():
            with open(lbl_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            for line in lines:
                parts = line.strip().split()
                if len(parts) >= 5:
                    cls_id = int(parts[0])
                    cx, cy, bw, bh = map(float, parts[1:5])
                    class_distribution[cls_id] = class_distribution.get(cls_id, 0) + 1
                    if 0.0 <= cx <= 1.0 and 0.0 <= cy <= 1.0 and 0.0 < bw <= 1.0 and 0.0 < bh <= 1.0:
                        valid_bboxes += 1
                    else:
                        invalid_bboxes += 1
                        print(f"[WARN] Out-of-bounds bbox in {lbl_path.name}: {line.strip()}")
        else:
            invalid_bboxes += 1

        # 4. Mask Check
        mask_path = masks_dir / f"{img_path.stem}_mask.png"
        if mask_path.exists():
            try:
                with Image.open(mask_path) as m:
                    mw, mh = m.size
                    if mw == w and mh == h:
                        valid_masks += 1
                    else:
                        invalid_masks += 1
            except Exception:
                invalid_masks += 1

    print(f"Total Images Checked   : {total_images}")
    print(f"Valid & Verified Images: {valid_images}")
    print(f"Corrupt Image Count    : {corrupt_images}")
    print(f"Valid Bounding Boxes   : {valid_bboxes}")
    print(f"Invalid Bounding Boxes : {invalid_bboxes}")
    print(f"Valid Damage Masks     : {valid_masks}")
    print(f"Duplicates Detected    : {len(duplicates)}")
    print(f"Class Distribution     : {class_distribution}")
    print("------------------------------------------------------------")

    success = corrupt_images == 0 and invalid_bboxes == 0
    print(f"Validation Result      : {'PASSED [OK]' if success else 'FAILED [X]'}")
    print("============================================================")

    # Save validation report
    report_file = SERVICE_DIR / "config" / "dataset_validation_report.json"
    with open(report_file, "w", encoding="utf-8") as rf:
        json.dump(
            {
                "status": "PASSED" if success else "FAILED",
                "total_images": total_images,
                "valid_images": valid_images,
                "corrupt_images": corrupt_images,
                "valid_bboxes": valid_bboxes,
                "invalid_bboxes": invalid_bboxes,
                "valid_masks": valid_masks,
                "duplicates_count": len(duplicates),
                "class_distribution": class_distribution,
            },
            rf,
            indent=2,
        )

    if not success:
        sys.exit(1)


if __name__ == "__main__":
    validate_all_datasets()
