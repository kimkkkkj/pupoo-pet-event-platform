from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from threading import Lock
from typing import Any

import joblib
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error

SEQUENCE_LENGTH = 60
FORECAST_HORIZON = 12
SUPPORTED_TARGET_TYPES = ("EVENT", "PROGRAM")
_FEATURE_COUNT = 8

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LstmPrediction:
    avg_score: float
    model_version: str


def _clamp100(value: float) -> float:
    return max(0.0, min(100.0, value))


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float, Decimal)):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _extract_score(item: Any) -> float | None:
    if isinstance(item, (int, float, Decimal)):
        return float(item)
    if isinstance(item, dict):
        for key in ("score", "congestion_score", "value", "v"):
            if key in item:
                return _to_float(item.get(key))
    return None


def _sanitize_sequence(input_sequence: list[Any] | None) -> list[float] | None:
    if not isinstance(input_sequence, list) or len(input_sequence) != SEQUENCE_LENGTH:
        return None

    values: list[float] = []
    for item in input_sequence:
        score = _extract_score(item)
        if score is None:
            return None
        values.append(_clamp100(score))
    return values


def _sigmoid(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-value))


def _estimate_lstm_raw_avg_score(sequence: list[float]) -> float:
    # Lightweight LSTM-style baseline with fixed gates.
    h = 0.0
    c = 0.0
    normalized = [(value / 50.0) - 1.0 for value in sequence]
    for x in normalized:
        forget_gate = _sigmoid((0.95 * x) + (0.20 * h) + 0.20)
        input_gate = _sigmoid((0.80 * x) + (0.30 * h) - 0.10)
        output_gate = _sigmoid((0.90 * x) + (0.15 * h) - 0.15)
        candidate = math.tanh((0.85 * x) + (0.25 * h))
        c = (forget_gate * c) + (input_gate * candidate)
        h = output_gate * math.tanh(c)

    current_score = _clamp100((h + 1.0) * 50.0)
    slope = (sequence[-1] - sequence[-12]) / 11.0

    forecasts: list[float] = []
    rolling = current_score
    for _ in range(FORECAST_HORIZON):
        rolling = _clamp100((rolling * 0.88) + ((rolling + slope * 1.4) * 0.12))
        forecasts.append(rolling)

    if not forecasts:
        return round(current_score, 1)
    return round(sum(forecasts) / len(forecasts), 1)


def _build_calibration_feature_vector(sequence: list[float], raw_score: float) -> np.ndarray:
    last_12 = sequence[-12:]
    last_30 = sequence[-30:]
    slope_12 = (last_12[-1] - last_12[0]) / max(len(last_12) - 1, 1)

    vector = np.asarray(
        [
            raw_score,
            float(np.mean(last_12)),
            float(np.std(last_12)),
            float(slope_12),
            float(np.mean(last_30)),
            float(max(last_12) - min(last_12)),
            float(sequence[-1]),
            float(sequence[0]),
        ],
        dtype=np.float32,
    )
    if vector.shape != (_FEATURE_COUNT,):
        raise ValueError(f"invalid calibration feature shape: {vector.shape}")
    return vector


def _apply_calibration(raw_score: float, sequence: list[float], artifact: dict[str, Any] | None) -> float:
    if not artifact:
        return round(_clamp100(raw_score), 1)

    coefficients = artifact.get("coefficients")
    intercept = artifact.get("intercept", 0.0)
    if not isinstance(coefficients, list):
        return round(_clamp100(raw_score), 1)

    coeff = np.asarray(coefficients, dtype=np.float32)
    if coeff.shape != (_FEATURE_COUNT,):
        return round(_clamp100(raw_score), 1)

    feature = _build_calibration_feature_vector(sequence, raw_score)
    calibrated = float(np.dot(feature, coeff) + float(intercept))
    return round(_clamp100(calibrated), 1)


def estimate_lstm_avg_score(
    input_sequence: list[Any] | None,
    artifact: dict[str, Any] | None = None,
) -> float | None:
    sequence = _sanitize_sequence(input_sequence)
    if sequence is None:
        return None

    raw_score = _estimate_lstm_raw_avg_score(sequence)
    return _apply_calibration(raw_score, sequence, artifact)


def _build_dataset_features(sequence_matrix: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    if sequence_matrix.ndim != 2 or sequence_matrix.shape[1] != SEQUENCE_LENGTH:
        raise ValueError(f"invalid sequence matrix shape: {sequence_matrix.shape}")

    feature_rows: list[np.ndarray] = []
    raw_scores: list[float] = []
    for row in sequence_matrix:
        seq = [float(_clamp100(value)) for value in row.tolist()]
        raw = _estimate_lstm_raw_avg_score(seq)
        feature_rows.append(_build_calibration_feature_vector(seq, raw))
        raw_scores.append(raw)

    if not feature_rows:
        return np.empty((0, _FEATURE_COUNT), dtype=np.float32), np.empty((0,), dtype=np.float32)

    return (
        np.vstack(feature_rows).astype(np.float32),
        np.asarray(raw_scores, dtype=np.float32),
    )


def train_lstm_calibration_artifact(
    sequence_matrix: np.ndarray,
    target_avg: np.ndarray,
    target_type: str,
    validation_ratio: float = 0.2,
    random_seed: int = 42,
) -> tuple[dict[str, Any], dict[str, float]]:
    sample_count = int(sequence_matrix.shape[0])
    if sample_count < 2:
        raise ValueError(f"{target_type}: not enough samples for LSTM calibration ({sample_count})")

    features, raw_scores = _build_dataset_features(sequence_matrix)
    targets = np.asarray(target_avg, dtype=np.float32)
    if targets.shape[0] != sample_count:
        raise ValueError(f"{target_type}: target size mismatch")

    rng = np.random.default_rng(random_seed)
    indices = rng.permutation(sample_count)
    train_count = int(round(sample_count * (1.0 - validation_ratio)))
    train_count = min(max(train_count, 1), sample_count - 1)

    train_indices = indices[:train_count]
    valid_indices = indices[train_count:]

    X_train = features[train_indices]
    X_valid = features[valid_indices]
    y_train = targets[train_indices]
    y_valid = targets[valid_indices]

    model = Ridge(alpha=0.8)
    model.fit(X_train, y_train)

    pred_valid = np.clip(model.predict(X_valid), 0.0, 100.0)
    raw_valid = np.clip(raw_scores[valid_indices], 0.0, 100.0)

    metrics = {
        "sampleCount": int(sample_count),
        "trainCount": int(train_count),
        "validCount": int(sample_count - train_count),
        "featureCount": int(features.shape[1]),
        "avgMae": float(mean_absolute_error(y_valid, pred_valid)),
        "avgRmse": float(np.sqrt(mean_squared_error(y_valid, pred_valid))),
        "baselineAvgMae": float(mean_absolute_error(y_valid, raw_valid)),
        "baselineAvgRmse": float(np.sqrt(mean_squared_error(y_valid, raw_valid))),
    }

    artifact = {
        "targetType": target_type,
        "sequenceLength": SEQUENCE_LENGTH,
        "featureVersion": "lstm_calibration_v1",
        "trainedAt": datetime.now().isoformat(),
        "coefficients": model.coef_.astype(np.float32).tolist(),
        "intercept": float(model.intercept_),
        "metrics": metrics,
    }
    return artifact, metrics


def _default_model_dir() -> Path:
    return Path(__file__).resolve().parents[4] / "artifacts" / "congestion"


class LstmCalibrationRegistry:
    def __init__(self, model_dir: str | None = None, enabled: bool = True) -> None:
        self._enabled = enabled
        self._model_dir = Path(model_dir).expanduser().resolve() if model_dir else _default_model_dir()
        self._lock = Lock()
        self._loaded = False
        self._artifacts: dict[str, dict[str, Any]] = {}

    def predict(self, target_type: str, input_sequence: list[Any] | None) -> LstmPrediction | None:
        if not self._enabled:
            return None

        sequence = _sanitize_sequence(input_sequence)
        if sequence is None:
            return None

        raw_score = _estimate_lstm_raw_avg_score(sequence)
        self._ensure_loaded()
        artifact = self._artifacts.get(target_type.upper())
        calibrated = _apply_calibration(raw_score, sequence, artifact)
        model_version = str((artifact or {}).get("trainedAt") or "lstm-baseline")
        return LstmPrediction(
            avg_score=calibrated,
            model_version=model_version,
        )

    def _ensure_loaded(self) -> None:
        if self._loaded:
            return

        with self._lock:
            if self._loaded:
                return

            loaded: dict[str, dict[str, Any]] = {}
            for target_type in SUPPORTED_TARGET_TYPES:
                file_path = self._model_dir / f"{target_type.lower()}_lstm_baseline.joblib"
                if not file_path.exists():
                    continue
                try:
                    payload = joblib.load(file_path)
                    if isinstance(payload, dict):
                        loaded[target_type] = payload
                except Exception:
                    logger.exception("Failed to load LSTM calibration artifact. path=%s", file_path)

            self._artifacts = loaded
            self._loaded = True
