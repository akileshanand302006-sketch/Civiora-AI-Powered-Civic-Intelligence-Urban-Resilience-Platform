"""
Civiora AI Engine - Storage Report & Resource Manifest Synchronizer
Calculates actual disk usage across models, datasets, checkpoints, and caches,
enforcing the 40 GB hard budget and updating config/resource_manifest.json.
"""

import os
import sys
import json
import time
from pathlib import Path

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
SERVICE_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(SERVICE_DIR))

from app.core.storage_budget import StorageBudgetManager
from app.config import settings


def generate_storage_report():
    budget_mgr = StorageBudgetManager()
    report = budget_mgr.get_storage_report()
    budget_mgr.update_manifest_usage()

    models_dir = SERVICE_DIR / "artifacts" / "models"
    model_files = []
    if models_dir.exists():
        for p in models_dir.glob("*"):
            if p.is_file():
                sz_mb = p.stat().st_size / (1024 * 1024)
                model_files.append({"file": p.name, "size_mb": round(sz_mb, 2)})

    print("============================================================")
    print("   CIVIORA AI — DISK USAGE & STORAGE BUDGET REPORT          ")
    print("============================================================")
    print(f"Hard Storage Budget       : {report['hard_budget_gb']:.2f} GB")
    print(f"Total Disk Usage          : {report['total_used_gb']:.4f} GB")
    print(f"Remaining Storage Budget  : {report['remaining_budget_gb']:.4f} GB")
    print(f"Usage Percentage          : {report['usage_percentage']:.2f}%")
    print("------------------------------------------------------------")
    print("CATEGORY BREAKDOWN:")
    print(f"  - Model Weights         : {report['breakdown']['models_mb']:.2f} MB")
    print(f"  - Datasets & Annotations: {report['breakdown']['datasets_mb']:.2f} MB")
    print(f"  - Training Checkpoints  : {report['breakdown']['checkpoints_mb']:.2f} MB")
    print(f"  - Cache & Embeddings    : {report['breakdown']['cache_mb']:.2f} MB")
    print("------------------------------------------------------------")
    print("INDIVIDUAL MODEL ARTIFACTS:")
    for mf in model_files:
        print(f"  - {mf['file']:<26}: {mf['size_mb']:>8.2f} MB")
    print("------------------------------------------------------------")
    compliance = "COMPLIANT [SAFE]" if not report["budget_exceeded"] else "VIOLATION [EXCEEDED]"
    print(f"Budget Compliance Status  : {compliance}")
    print("============================================================")

    # Export machine-readable storage report
    out_path = SERVICE_DIR / "artifacts" / "storage_report.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "storage_summary": report,
                "model_files": model_files,
                "budget_compliance": not report["budget_exceeded"],
            },
            f,
            indent=2,
        )
    print(f"Storage report exported to: {out_path}")
    return report


if __name__ == "__main__":
    generate_storage_report()
