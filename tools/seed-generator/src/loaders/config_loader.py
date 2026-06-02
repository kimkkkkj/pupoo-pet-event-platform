"""YAML config loader with defaults."""

from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any

import yaml


DEFAULT_CONFIG: dict[str, Any] = {
    "project": "pupoo",
    "schema_path": "../../db/pupoo_schema_v6.6.sql",
    "mode_default": "all",
    "output_path_operational": "./output/pupoo_seed.sql",
    "output_path_ai": "./output/ai_pupoo_seed.sql",
    "users": {"count": 12000},
    "pets": {"max_per_user": 3, "ownership_ratio": 0.68},
    "events": {
        "total_count": 15,
        "status_distribution": {"ENDED": 5, "ONGOING": 7, "PLANNED": 3},
    },
    "booths": {"min_per_event": 35},
    "programs": {
        "session_min_per_day": 2,
        "contest_min_per_day": 2,
        "experience_min_per_day": 6,
    },
    "qr": {"enabled": True, "volume_scale": 2.2},
    "community": {"enabled": True},
    "payments": {"enabled": True},
    "ai": {
        "interval_minutes": 1,
        "scale_mode": "normal",
        "training_window_minutes": 60,
        "prediction_enabled": True,
        "event_timeseries_enabled": True,
        "program_timeseries_enabled": True,
        "event_operation_hours": {"start_hour": 9, "end_hour": 17},
        "program_operation_hours": {"start_hour": 9, "end_hour": 18},
        "target_rows": {
            "light": {
                "ai_event_congestion_timeseries": {"min": 20000, "max": 40000, "target": 30000},
                "ai_program_congestion_timeseries": {"min": 80000, "max": 150000, "target": 110000},
                "ai_training_dataset": {"min": 10000, "max": 25000, "target": 18000},
                "ai_prediction_logs": {"min": 2000, "max": 5000, "target": 3500},
            },
            "normal": {
                "ai_event_congestion_timeseries": {"min": 40000, "max": 80000, "target": 45000},
                "ai_program_congestion_timeseries": {"min": 150000, "max": 300000, "target": 180000},
                "ai_training_dataset": {"min": 25000, "max": 60000, "target": 32000},
                "ai_prediction_logs": {"min": 5000, "max": 10000, "target": 5500},
            },
            "heavy": {
                "ai_event_congestion_timeseries": {"min": 80000, "max": 120000, "target": 90000},
                "ai_program_congestion_timeseries": {"min": 300000, "max": 500000, "target": 360000},
                "ai_training_dataset": {"min": 60000, "max": 120000, "target": 80000},
                "ai_prediction_logs": {"min": 10000, "max": 20000, "target": 12000},
            },
        },
    },
}


def _merge_defaults(base: dict[str, Any], loaded: dict[str, Any]) -> dict[str, Any]:
    merged = deepcopy(base)
    for key, value in loaded.items():
        if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
            merged[key] = _merge_defaults(merged[key], value)
        else:
            merged[key] = value
    return merged


def _normalize_legacy_keys(config: dict[str, Any]) -> dict[str, Any]:
    # Backward compatibility with previous config keys.
    if "output_path" in config and "output_path_operational" not in config:
        config["output_path_operational"] = config["output_path"]
    if "ai" in config and isinstance(config["ai"], dict):
        ai_cfg = config["ai"]
        if "output_path" in ai_cfg and "output_path_ai" not in config:
            config["output_path_ai"] = ai_cfg["output_path"]
        if "step_minutes" in ai_cfg and "interval_minutes" not in ai_cfg:
            ai_cfg["interval_minutes"] = ai_cfg["step_minutes"]
        if "scale" in ai_cfg and "scale_mode" not in ai_cfg:
            ai_cfg["scale_mode"] = ai_cfg["scale"]
    return config


def load_config(path: str | Path) -> dict[str, Any]:
    """Load YAML config and fill missing values by defaults."""
    config_path = Path(path).resolve()
    if not config_path.exists():
        raise FileNotFoundError(f"config file not found: {config_path}")

    with config_path.open("r", encoding="utf-8") as fp:
        loaded = yaml.safe_load(fp) or {}
    if not isinstance(loaded, dict):
        raise ValueError("config root must be a mapping(dict)")

    merged = _merge_defaults(DEFAULT_CONFIG, loaded)
    merged = _normalize_legacy_keys(merged)
    return merged
