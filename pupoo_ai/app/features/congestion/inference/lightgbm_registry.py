from __future__ import annotations

import logging
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from threading import Lock
from typing import Any

import joblib
import numpy as np

SEQUENCE_LENGTH = 60
SUPPORTED_TARGET_TYPES = ("EVENT", "PROGRAM")
_ENGINEERED_FEATURE_COUNT = 18
_CALENDAR_FEATURE_COUNT = 6

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CongestionModelPrediction:
    avg_score: float
    peak_score: float
    confidence: float
    model_version: str


def _default_model_dir() -> Path:
    return Path(__file__).resolve().parents[4] / "artifacts" / "congestion"


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


def _sanitize_sequence(input_sequence: list[Any] | None) -> np.ndarray | None:
    if not isinstance(input_sequence, list) or len(input_sequence) != SEQUENCE_LENGTH:
        return None

    values: list[float] = []
    for item in input_sequence:
        score = _extract_score(item)
        if score is None:
            return None
        values.append(_clamp100(score))

    sequence = np.asarray(values, dtype=np.float32)
    if sequence.shape != (SEQUENCE_LENGTH,):
        return None

    sequence = np.nan_to_num(sequence, nan=0.0, posinf=100.0, neginf=0.0)
    return np.clip(sequence, 0.0, 100.0)


def _build_feature_vector(sequence: np.ndarray) -> np.ndarray:
    raw = sequence.reshape(1, SEQUENCE_LENGTH).astype(np.float32)

    seq_mean = raw.mean(axis=1, keepdims=True)
    seq_std = raw.std(axis=1, keepdims=True)
    seq_min = raw.min(axis=1, keepdims=True)
    seq_max = raw.max(axis=1, keepdims=True)
    seq_first = raw[:, :1]
    seq_last = raw[:, -1:]

    quantiles = np.percentile(raw, [25.0, 50.0, 75.0], axis=1).T.astype(np.float32)
    q25 = quantiles[:, 0:1]
    q50 = quantiles[:, 1:2]
    q75 = quantiles[:, 2:3]

    mean_last5 = raw[:, -5:].mean(axis=1, keepdims=True)
    mean_last10 = raw[:, -10:].mean(axis=1, keepdims=True)
    mean_last15 = raw[:, -15:].mean(axis=1, keepdims=True)
    std_last5 = raw[:, -5:].std(axis=1, keepdims=True)
    std_last10 = raw[:, -10:].std(axis=1, keepdims=True)
    min_last10 = raw[:, -10:].min(axis=1, keepdims=True)
    max_last10 = raw[:, -10:].max(axis=1, keepdims=True)

    delta_last_first = seq_last - seq_first

    x = np.arange(SEQUENCE_LENGTH, dtype=np.float32)
    x_centered = x - x.mean()
    denominator = float(np.sum(x_centered * x_centered))
    raw_centered = raw - seq_mean
    slope = (raw_centered @ x_centered.reshape(SEQUENCE_LENGTH, 1)) / denominator

    engineered = np.concatenate(
        [
            seq_mean,
            seq_std,
            seq_min,
            seq_max,
            seq_first,
            seq_last,
            q25,
            q50,
            q75,
            mean_last5,
            mean_last10,
            mean_last15,
            std_last5,
            std_last10,
            min_last10,
            max_last10,
            delta_last_first,
            slope,
        ],
        axis=1,
    ).astype(np.float32)

    if engineered.shape[1] != _ENGINEERED_FEATURE_COUNT:
        raise ValueError(f"engineered feature mismatch: {engineered.shape[1]}")

    return np.concatenate([raw, engineered], axis=1).astype(np.float32)


def _sanitize_calendar_features(features: list[Any] | None) -> np.ndarray | None:
    if features is None:
        return None
    if not isinstance(features, list) or len(features) != _CALENDAR_FEATURE_COUNT:
        return None

    parsed: list[float] = []
    for value in features:
        numeric = _to_float(value)
        if numeric is None:
            return None
        parsed.append(float(numeric))

    vector = np.asarray(parsed, dtype=np.float32).reshape(1, _CALENDAR_FEATURE_COUNT)
    vector = np.nan_to_num(vector, nan=0.0, posinf=1.0, neginf=0.0)
    return vector


def _build_feature_vector_with_calendar(
    sequence: np.ndarray,
    calendar_features: np.ndarray | None,
) -> np.ndarray:
    base = _build_feature_vector(sequence)
    if calendar_features is None:
        return base
    return np.concatenate([base, calendar_features], axis=1).astype(np.float32)


class LightGbmCongestionRegistry:
    def __init__(self, model_dir: str | None = None, enabled: bool = True) -> None:
        self._enabled = enabled
        self._model_dir = Path(model_dir).expanduser().resolve() if model_dir else _default_model_dir()
        self._lock = Lock()
        self._loaded = False
        self._artifacts: dict[str, dict[str, Any]] = {}
        self._load_errors: dict[str, str] = {}

    def predict(
        self,
        target_type: str,
        input_sequence: list[Any] | None,
        calendar_features: list[Any] | None = None,
    ) -> CongestionModelPrediction | None:
        if not self._enabled:
            return None

        sequence = _sanitize_sequence(input_sequence)
        if sequence is None:
            return None

        self._ensure_loaded()
        artifact = self._artifacts.get(target_type.upper())
        if not artifact:
            return None

        model_avg = artifact.get("modelAvg")
        model_peak = artifact.get("modelPeak")
        if model_avg is None or model_peak is None:
            return None

        try:
            calendar_vector = _sanitize_calendar_features(calendar_features)
            base_features = _build_feature_vector_with_calendar(sequence, None)
            context_features = _build_feature_vector_with_calendar(sequence, calendar_vector)
            base_dim = int(base_features.shape[1])
            context_dim = int(context_features.shape[1])

            expected_dim = getattr(model_avg, "n_features_in_", None)
            if expected_dim is None:
                expected_dim = getattr(model_peak, "n_features_in_", None)
            expected_dim = int(expected_dim) if expected_dim is not None else None

            if expected_dim == context_dim:
                features = context_features
            elif expected_dim == base_dim or expected_dim is None:
                features = base_features
            else:
                raise ValueError(
                    f"feature dimension mismatch expected={expected_dim} base={base_dim} context={context_dim}"
                )

            avg_score = float(np.clip(model_avg.predict(features)[0], 0.0, 100.0))
            peak_score = float(np.clip(model_peak.predict(features)[0], 0.0, 100.0))
        except Exception:
            logger.exception("Failed to run congestion model inference. targetType=%s", target_type)
            return None

        # Confidence is bounded and gradually lowered for very volatile recent data.
        recent_std = float(np.std(sequence[-12:]))
        confidence = max(0.62, min(0.92, 0.88 - (recent_std / 140.0)))
        model_version = str(artifact.get("trainedAt") or "lightgbm")
        return CongestionModelPrediction(
            avg_score=_clamp100(avg_score),
            peak_score=_clamp100(max(avg_score, peak_score)),
            confidence=round(confidence, 2),
            model_version=model_version,
        )

    def load_status(self) -> dict[str, Any]:
        if not self._enabled:
            return {
                "enabled": False,
                "targets": {
                    target_type: {
                        "artifactPresent": False,
                        "loaded": False,
                    }
                    for target_type in SUPPORTED_TARGET_TYPES
                },
            }

        self._ensure_loaded()
        targets: dict[str, dict[str, bool]] = {}
        for target_type in SUPPORTED_TARGET_TYPES:
            file_path = self._model_dir / f"{target_type.lower()}_congestion_model.joblib"
            targets[target_type] = {
                "artifactPresent": file_path.exists(),
                "loaded": target_type in self._artifacts,
            }
        return {
            "enabled": True,
            "targets": targets,
        }

    def _ensure_loaded(self) -> None:
        if self._loaded:
            return

        with self._lock:
            if self._loaded:
                return

            loaded: dict[str, dict[str, Any]] = {}
            load_errors: dict[str, str] = {}
            for target_type in SUPPORTED_TARGET_TYPES:
                file_path = self._model_dir / f"{target_type.lower()}_congestion_model.joblib"
                if not file_path.exists():
                    continue
                try:
                    payload = joblib.load(file_path)
                    if isinstance(payload, dict):
                        loaded[target_type] = payload
                except Exception as exc:
                    load_errors[target_type] = exc.__class__.__name__
                    logger.exception("Failed to load congestion model artifact. path=%s", file_path)

            self._artifacts = loaded
            self._load_errors = load_errors
            self._loaded = True
