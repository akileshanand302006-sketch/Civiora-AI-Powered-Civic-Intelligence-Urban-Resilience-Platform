"""
Civiora AI Engine - Storage Budget Tests
Verifies that StorageBudgetManager enforces the 40GB limit, calculates
directory usage accurately, and blocks excessive allocations.
"""

import pytest
from pathlib import Path
from app.core.storage_budget import StorageBudgetManager
from app.config import settings


def test_storage_budget_initialization():
    mgr = StorageBudgetManager()
    assert mgr.budget_gb == 40.0
    assert mgr.hard_limit_bytes == 40 * 1024 * 1024 * 1024


def test_storage_report_structure():
    mgr = StorageBudgetManager()
    report = mgr.get_storage_report()

    assert "hard_budget_gb" in report
    assert "total_used_gb" in report
    assert "remaining_budget_gb" in report
    assert "usage_percentage" in report
    assert "breakdown" in report
    assert report["hard_budget_gb"] == 40.0
    assert report["total_used_gb"] < 40.0
    assert report["budget_exceeded"] is False


def test_verify_can_allocate():
    mgr = StorageBudgetManager()
    # 10 MB should easily be allowed
    assert mgr.can_allocate_bytes(10 * 1024 * 1024) is True

    # 100 GB should be rejected as it exceeds the 40 GB hard limit
    assert mgr.can_allocate_bytes(100 * 1024 * 1024 * 1024) is False
