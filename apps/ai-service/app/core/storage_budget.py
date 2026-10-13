# ============================================================
# Civiora Storage Budget & Resource Management Engine
# Strictly enforces AI_STORAGE_BUDGET_GB (default 40 GB)
# ============================================================

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger("civiora.ai.storage")

class StorageBudgetManager:
    """
    Monitors and enforces the storage budget across models, datasets,
    temporary training runs, and cache directories.
    """

    def __init__(self, base_dir: Path = None, budget_gb: float = None):
        if base_dir is None:
            self.base_dir = Path(__file__).resolve().parent.parent.parent
        else:
            self.base_dir = Path(base_dir).resolve()
        
        self.budget_gb = budget_gb if budget_gb is not None else 40.0
        self.hard_limit_bytes = int(self.budget_gb * 1024 * 1024 * 1024)
        self.manifest_path = self.base_dir / "config" / "resource_manifest.json"

    def can_allocate_bytes(self, expected_bytes: int) -> bool:
        """Alias for verify_can_allocate."""
        return self.verify_can_allocate(expected_bytes)

    def get_directory_size_bytes(self, directory: Path) -> int:
        """Recursively calculate the actual size of a directory on disk."""
        total_size = 0
        if not directory.exists():
            return 0
        if directory.is_file():
            return directory.stat().st_size
        for dirpath, _, filenames in os.walk(directory):
            for f in filenames:
                fp = Path(dirpath) / f
                try:
                    if fp.is_file() and not fp.is_symlink():
                        total_size += fp.stat().st_size
                except (OSError, PermissionError):
                    continue
        return total_size

    def get_storage_report(self) -> Dict[str, Any]:
        """
        Calculates actual disk usage for models, datasets, checkpoints, and caches.
        """
        models_dir = self.base_dir / "artifacts" / "models"
        datasets_dir = self.base_dir / "datasets"
        checkpoints_dir = self.base_dir / "artifacts" / "checkpoints"
        cache_dir = self.base_dir / "artifacts" / "cache"

        models_bytes = self.get_directory_size_bytes(models_dir)
        datasets_bytes = self.get_directory_size_bytes(datasets_dir)
        checkpoints_bytes = self.get_directory_size_bytes(checkpoints_dir)
        cache_bytes = self.get_directory_size_bytes(cache_dir)

        total_used_bytes = models_bytes + datasets_bytes + checkpoints_bytes + cache_bytes
        total_used_gb = total_used_bytes / (1024 * 1024 * 1024)
        remaining_gb = max(0.0, self.budget_gb - total_used_gb)

        return {
            "hard_budget_gb": self.budget_gb,
            "total_used_gb": round(total_used_gb, 4),
            "remaining_budget_gb": round(remaining_gb, 4),
            "usage_percentage": round((total_used_bytes / self.hard_limit_bytes) * 100, 2),
            "breakdown": {
                "models_mb": round(models_bytes / (1024 * 1024), 2),
                "datasets_mb": round(datasets_bytes / (1024 * 1024), 2),
                "checkpoints_mb": round(checkpoints_bytes / (1024 * 1024), 2),
                "cache_mb": round(cache_bytes / (1024 * 1024), 2),
            },
            "budget_exceeded": total_used_bytes > self.hard_limit_bytes,
        }

    def verify_can_allocate(self, expected_bytes: int) -> bool:
        """
        Pre-flight check before initiating any model weight or dataset download.
        """
        report = self.get_storage_report()
        projected_bytes = (report["total_used_gb"] * 1024 * 1024 * 1024) + expected_bytes
        if projected_bytes > self.hard_limit_bytes:
            logger.error(
                f"[StorageBudget] Allocation of {expected_bytes / (1024*1024):.1f}MB rejected. "
                f"Projected {projected_bytes / (1024**3):.2f}GB exceeds budget {self.budget_gb}GB"
            )
            return False
        return True

    def update_manifest_usage(self) -> None:
        """Synchronize the resource manifest file with current measured disk usage."""
        if not self.manifest_path.exists():
            return
        try:
            with open(self.manifest_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            report = self.get_storage_report()
            data["storage_policy"]["current_usage_gb"] = report["total_used_gb"]
            data["storage_policy"]["hard_budget_gb"] = self.budget_gb

            with open(self.manifest_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not update resource manifest: {e}")
