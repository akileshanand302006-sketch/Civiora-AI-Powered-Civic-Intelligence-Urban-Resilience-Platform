"""
Civiora AI Engine - Public Dataset Discovery Script
Programmatically audits candidate public datasets for civic intelligence,
evaluating licenses, sizes, annotation formats, and storage budget fit.
"""

import json
import sys
from pathlib import Path

# Setup paths
SCRIPT_DIR = Path(__file__).resolve().parent
SERVICE_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(SERVICE_DIR))

from app.core.storage_budget import StorageBudgetManager
from app.config import settings

CANDIDATE_DATASETS = [
    {
        "id": "rdd2022-subset",
        "name": "Road Damage Dataset 2022 (RDD2022)",
        "source": "https://bigdata.cps.ibaraki.ac.jp/road_damage_dataset/",
        "license": "CC-BY-SA-4.0",
        "commercial_use_allowed": True,
        "format": "VOC XML / YOLO",
        "raw_categories": ["D00", "D10", "D20", "D40", "Repair"],
        "civiora_mapping": {
            "D00": "road_crack",
            "D10": "road_crack",
            "D20": "road_crack",
            "D40": "pothole",
            "Repair": "road_surface_damage",
        },
        "estimated_size_mb": 450.0,
        "sample_count": 2500,
        "suitability": "High - standard benchmark for municipal road surface distress",
        "required_attribution": "Crowdsensing-based Road Damage Detection Challenge 2022",
    },
    {
        "id": "roboflow-pothole",
        "name": "Public Pothole Detection (Roboflow Universe)",
        "source": "https://universe.roboflow.com/annotated-potholes/potholes",
        "license": "CC-BY-4.0",
        "commercial_use_allowed": True,
        "format": "YOLOv8/11 format",
        "raw_categories": ["pothole"],
        "civiora_mapping": {"pothole": "pothole"},
        "estimated_size_mb": 85.0,
        "sample_count": 665,
        "suitability": "High - verified bounding boxes specifically for asphalt potholes",
        "required_attribution": "Roboflow Universe Community / CC-BY-4.0",
    },
    {
        "id": "taco-trash-subset",
        "name": "TACO: Trash Annotations in Context (Subset)",
        "source": "http://tacodataset.org/",
        "license": "CC-BY-4.0",
        "commercial_use_allowed": True,
        "format": "COCO JSON",
        "raw_categories": ["Plastics", "Bottles", "Trash can", "Litter pile", "Unlabeled litter"],
        "civiora_mapping": {
            "Plastics": "garbage",
            "Bottles": "garbage",
            "Litter pile": "garbage",
            "Unlabeled litter": "illegal_dumping",
        },
        "estimated_size_mb": 240.0,
        "sample_count": 1500,
        "suitability": "High - open-waste and roadside litter identification",
        "required_attribution": "Pedro F. Proença and Pedro Simões, TACO Dataset",
    },
    {
        "id": "floodnet-civic-subset",
        "name": "FloodNet: High-Resolution Urban Flood Dataset (Subset)",
        "source": "https://github.com/BinaLab/FloodNet-Challenge-EARTHVISION2021",
        "license": "CC-BY-4.0",
        "commercial_use_allowed": True,
        "format": "Segmentation Mask & Bounding Boxes",
        "raw_categories": ["Flooded_Road", "Non_Flooded_Road", "Water_Accumulation"],
        "civiora_mapping": {
            "Flooded_Road": "flooding",
            "Water_Accumulation": "waterlogging",
        },
        "estimated_size_mb": 350.0,
        "sample_count": 1200,
        "suitability": "High - monsoon waterlogging and flood hazard segmentation",
        "required_attribution": "R. Rahnamayan et al., FloodNet Challenge",
    },
    {
        "id": "civiora-tn-hazards-eval",
        "name": "Civiora Tamil Nadu Urban Hazards Evaluation Suite",
        "source": "Internal Curated Benchmarks across 38 Districts",
        "license": "CC-BY-4.0",
        "commercial_use_allowed": True,
        "format": "Unified Civiora Multimodal (YOLO, OCR, Seg, Qwen captions)",
        "raw_categories": [
            "pothole",
            "road_crack",
            "garbage",
            "flooding",
            "fallen_tree",
            "damaged_streetlight",
            "damaged_traffic_sign",
            "drainage_obstruction",
        ],
        "civiora_mapping": {k: k for k in [
            "pothole",
            "road_crack",
            "garbage",
            "flooding",
            "fallen_tree",
            "damaged_streetlight",
            "damaged_traffic_sign",
            "drainage_obstruction",
        ]},
        "estimated_size_mb": 120.0,
        "sample_count": 800,
        "suitability": "Maximum - covers all 8 canonical Civiora classes and 38 TN districts",
        "required_attribution": "Civiora Civic Intelligence Project",
    },
]


def discover_and_audit():
    budget_mgr = StorageBudgetManager()
    total_est_mb = sum(ds["estimated_size_mb"] for ds in CANDIDATE_DATASETS)
    total_est_gb = total_est_mb / 1024.0

    print("============================================================")
    print("   CIVIORA AI — PUBLIC DATASET DISCOVERY & AUDIT            ")
    print("============================================================")
    print(f"Configured Hard Storage Budget : {settings.AI_STORAGE_BUDGET_GB:.1f} GB")
    print(f"Target Combined Footprint      : {settings.AI_TARGET_STORAGE_GB:.1f} GB")
    print(f"Candidate Datasets Evaluated   : {len(CANDIDATE_DATASETS)}")
    print(f"Total Candidate Footprint      : {total_est_gb:.2f} GB ({total_est_mb:.1f} MB)")
    print(f"Budget Check Result            : {'PASSED (Safe to acquire)' if total_est_gb <= 10.0 else 'OVER BUDGET'}")
    print("------------------------------------------------------------")

    eligible_datasets = []
    for ds in CANDIDATE_DATASETS:
        fits = budget_mgr.can_allocate_bytes(int(ds["estimated_size_mb"] * 1024 * 1024))
        status = "ELIGIBLE" if fits and ds["commercial_use_allowed"] else "INELIGIBLE"
        print(f"[{status}] {ds['name']}")
        print(f"       ID       : {ds['id']}")
        print(f"       License  : {ds['license']}")
        print(f"       Est Size : {ds['estimated_size_mb']:.1f} MB")
        print(f"       Mapping  : {list(ds['civiora_mapping'].values())[:3]}...")
        if fits:
            eligible_datasets.append(ds)

    output_path = SERVICE_DIR / "config" / "discovered_datasets.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "audit_summary": {
                    "hard_budget_gb": settings.AI_STORAGE_BUDGET_GB,
                    "candidate_count": len(CANDIDATE_DATASETS),
                    "eligible_count": len(eligible_datasets),
                    "total_candidate_mb": total_est_mb,
                },
                "candidates": CANDIDATE_DATASETS,
            },
            f,
            indent=2,
        )

    print("------------------------------------------------------------")
    print(f"Discovery report saved to: {output_path}")
    print("============================================================")
    return eligible_datasets


if __name__ == "__main__":
    discover_and_audit()
