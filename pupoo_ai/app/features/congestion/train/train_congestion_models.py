from __future__ import annotations

import argparse
import json
import math
import os
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pymysql
from lightgbm import LGBMRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

from app.features.congestion.inference.lstm_baseline import train_lstm_calibration_artifact

SEQUENCE_LENGTH = 60
SUPPORTED_TARGET_TYPES = ("EVENT", "PROGRAM")
MIN_HISTORY_POINTS = 12
TARGET_HORIZON_POINTS = 12
_CALENDAR_FEATURE_COUNT = 6
_FIXED_SOLAR_HOLIDAYS = {
    (1, 1),   # New Year's Day
    (3, 1),   # Independence Movement Day
    (5, 5),   # Children's Day
    (6, 6),   # Memorial Day
    (8, 15),  # Liberation Day
    (10, 3),  # National Foundation Day
    (10, 9),  # Hangul Day
    (12, 25), # Christmas
}
MYSQL_JDBC_PATTERN = re.compile(
    r"^jdbc:mysql://(?P<host>[^:/?#]+)(?::(?P<port>\d+))?/(?P<database>[^?]+)"
)


@dataclass(frozen=True)
class DbConfig:
    host: str
    port: int
    user: str
    password: str
    database: str


def _project_root() -> Path:
    return Path(__file__).resolve().parents[4]


def _parse_jdbc_url(url: str | None) -> tuple[str, int, str] | None:
    if not url:
        return None
    match = MYSQL_JDBC_PATTERN.match(url.strip())
    if not match:
        return None
    host = match.group("host")
    port = int(match.group("port") or 3306)
    database = match.group("database")
    return host, port, database


def _resolve_db_config(args: argparse.Namespace) -> DbConfig:
    jdbc_url = args.db_url or os.getenv("PUPOO_AI_TRAIN_DB_URL") or os.getenv("SPRING_DATASOURCE_URL")
    parsed = _parse_jdbc_url(jdbc_url)

    default_host = "localhost"
    default_port = 3306
    default_database = "pupoodb"

    if parsed:
        default_host, default_port, default_database = parsed

    host = args.db_host or os.getenv("PUPOO_AI_TRAIN_DB_HOST") or default_host
    port = int(args.db_port or os.getenv("PUPOO_AI_TRAIN_DB_PORT") or default_port)
    user = args.db_user or os.getenv("PUPOO_AI_TRAIN_DB_USER") or os.getenv("SPRING_DATASOURCE_USERNAME") or "pupoo"
    password = (
        args.db_password
        or os.getenv("PUPOO_AI_TRAIN_DB_PASSWORD")
        or os.getenv("SPRING_DATASOURCE_PASSWORD")
        or "pupoo1234!"
    )
    database = args.db_name or os.getenv("PUPOO_AI_TRAIN_DB_NAME") or default_database

    return DbConfig(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
    )


def _to_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    if isinstance(value, (float, int)):
        return float(value)
    if isinstance(value, Decimal):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    if isinstance(value, str):
        # Common DB datetime shape: "YYYY-MM-DD HH:MM:SS"
        normalized = value.strip().replace("T", " ")
        try:
            return datetime.fromisoformat(normalized)
        except ValueError:
            return None
    return None


def _is_korean_holiday(target_date: date) -> bool:
    if (target_date.month, target_date.day) in _FIXED_SOLAR_HOLIDAYS:
        return True
    try:
        import holidays

        return target_date in holidays.country_holidays("KR", years=[target_date.year])
    except Exception:
        return False


def _build_calendar_feature_vector(
    base_timestamp: datetime | None,
    start_at: datetime | None,
    end_at: datetime | None,
) -> np.ndarray:
    base_dt = _to_datetime(base_timestamp)
    start_dt = _to_datetime(start_at)
    end_dt = _to_datetime(end_at)

    if base_dt is None:
        return np.zeros((_CALENDAR_FEATURE_COUNT,), dtype=np.float32)

    weekday = int(base_dt.weekday())  # Mon=0 ... Sun=6
    angle = (2.0 * math.pi * weekday) / 7.0
    weekday_sin = math.sin(angle)
    weekday_cos = math.cos(angle)
    is_weekend = 1.0 if weekday >= 5 else 0.0
    is_holiday = 1.0 if _is_korean_holiday(base_dt.date()) else 0.0

    day_index_ratio = 0.0
    progress_ratio = 0.0
    if start_dt and end_dt and end_dt >= start_dt:
        total_days = max((end_dt.date() - start_dt.date()).days + 1, 1)
        day_index = min(max((base_dt.date() - start_dt.date()).days, 0), total_days - 1)
        day_index_ratio = 0.0 if total_days <= 1 else (day_index / float(total_days - 1))

        duration_seconds = max((end_dt - start_dt).total_seconds(), 1.0)
        elapsed_seconds = min(max((base_dt - start_dt).total_seconds(), 0.0), duration_seconds)
        progress_ratio = elapsed_seconds / duration_seconds

    return np.asarray(
        [
            round(float(weekday_sin), 6),
            round(float(weekday_cos), 6),
            float(is_weekend),
            float(is_holiday),
            round(float(day_index_ratio), 6),
            round(float(progress_ratio), 6),
        ],
        dtype=np.float32,
    )


def _extract_score(item: Any) -> float | None:
    if isinstance(item, (int, float, Decimal)):
        return float(item)

    if isinstance(item, dict):
        for key in ("score", "congestion_score", "value", "v"):
            if key in item:
                return _to_float(item.get(key), default=0.0)
        return None

    return None


def _sanitize_sequence(raw_json: str) -> np.ndarray | None:
    try:
        payload = json.loads(raw_json)
    except json.JSONDecodeError:
        return None

    if not isinstance(payload, list) or len(payload) != SEQUENCE_LENGTH:
        return None

    scores: list[float] = []
    for item in payload:
        score = _extract_score(item)
        if score is None:
            return None
        scores.append(score)

    try:
        sequence = np.asarray(scores, dtype=np.float32)
    except (TypeError, ValueError):
        return None

    if sequence.shape != (SEQUENCE_LENGTH,):
        return None

    sequence = np.nan_to_num(sequence, nan=0.0, posinf=100.0, neginf=0.0)
    sequence = np.clip(sequence, 0.0, 100.0)
    return sequence


def _pad_history_sequence(history: list[float]) -> np.ndarray:
    trimmed = history[-SEQUENCE_LENGTH:]
    if not trimmed:
        return np.zeros((SEQUENCE_LENGTH,), dtype=np.float32)

    clamped = [float(np.clip(value, 0.0, 100.0)) for value in trimmed]
    pad_value = clamped[0]
    if len(clamped) < SEQUENCE_LENGTH:
        clamped = ([pad_value] * (SEQUENCE_LENGTH - len(clamped))) + clamped
    return np.asarray(clamped, dtype=np.float32)


def _build_samples_from_grouped_series(
    grouped_scores: dict[int, list[float]],
    grouped_contexts: dict[int, list[np.ndarray]] | None = None,
    row_limit: int | None = None,
) -> tuple[list[np.ndarray], list[np.ndarray], list[float], list[float]]:
    sequences: list[np.ndarray] = []
    contexts: list[np.ndarray] = []
    avg_targets: list[float] = []
    peak_targets: list[float] = []

    for group_id in sorted(grouped_scores.keys()):
        scores = grouped_scores[group_id]
        context_points = (grouped_contexts or {}).get(group_id, [])
        if len(scores) < (MIN_HISTORY_POINTS + 2):
            continue

        for current_idx in range(1, len(scores) - 1):
            history = scores[max(0, current_idx - SEQUENCE_LENGTH):current_idx]
            if len(history) < MIN_HISTORY_POINTS:
                continue

            future_window = scores[current_idx:min(len(scores), current_idx + TARGET_HORIZON_POINTS)]
            if not future_window:
                continue

            sequence = _pad_history_sequence(history)
            target_avg = float(np.clip(np.mean(future_window), 0.0, 100.0))
            target_peak = float(np.clip(np.max(future_window), 0.0, 100.0))

            sequences.append(sequence)
            context_idx = max(current_idx - 1, 0)
            if context_idx < len(context_points):
                context_vector = context_points[context_idx]
            else:
                context_vector = np.zeros((_CALENDAR_FEATURE_COUNT,), dtype=np.float32)
            contexts.append(context_vector.astype(np.float32))
            avg_targets.append(target_avg)
            peak_targets.append(max(target_avg, target_peak))

            if row_limit and row_limit > 0 and len(sequences) >= row_limit:
                return sequences, contexts, avg_targets, peak_targets

    return sequences, contexts, avg_targets, peak_targets


def _fetch_target_rows_from_timeseries(
    db_config: DbConfig,
    target_type: str,
    row_limit: int | None = None,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    table_name = "ai_event_congestion_timeseries" if target_type == "EVENT" else "ai_program_congestion_timeseries"
    key_column = "event_id" if target_type == "EVENT" else "program_id"

    grouped_scores: dict[int, list[float]] = defaultdict(list)
    grouped_contexts: dict[int, list[np.ndarray]] = defaultdict(list)
    sql = f"""
        SELECT
            t.{key_column},
            t.timestamp_minute,
            e.start_at,
            e.end_at,
            t.congestion_score
        FROM {table_name} t
        INNER JOIN event e ON e.event_id = t.event_id
        WHERE t.congestion_score IS NOT NULL
        ORDER BY t.{key_column}, t.timestamp_minute
    """

    connection = pymysql.connect(
        host=db_config.host,
        port=db_config.port,
        user=db_config.user,
        password=db_config.password,
        database=db_config.database,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.SSCursor,
        autocommit=True,
    )

    try:
        with connection.cursor() as cursor:
            cursor.execute(sql)
            while True:
                batch = cursor.fetchmany(4096)
                if not batch:
                    break
                for group_id, timestamp_minute, event_start_at, event_end_at, score in batch:
                    if group_id is None or timestamp_minute is None or score is None:
                        continue
                    grouped_scores[int(group_id)].append(float(np.clip(_to_float(score), 0.0, 100.0)))
                    grouped_contexts[int(group_id)].append(
                        _build_calendar_feature_vector(
                            base_timestamp=_to_datetime(timestamp_minute),
                            start_at=_to_datetime(event_start_at),
                            end_at=_to_datetime(event_end_at),
                        )
                    )
    finally:
        connection.close()

    sequences, contexts, avg_targets, peak_targets = _build_samples_from_grouped_series(
        grouped_scores=grouped_scores,
        grouped_contexts=grouped_contexts,
        row_limit=row_limit,
    )
    if sequences:
        return (
            np.vstack(sequences).astype(np.float32),
            np.vstack(contexts).astype(np.float32),
            np.asarray(avg_targets, dtype=np.float32),
            np.asarray(peak_targets, dtype=np.float32),
        )

    return (
        np.empty((0, SEQUENCE_LENGTH), dtype=np.float32),
        np.empty((0, _CALENDAR_FEATURE_COUNT), dtype=np.float32),
        np.empty((0,), dtype=np.float32),
        np.empty((0,), dtype=np.float32),
    )


def _fetch_training_rows(
    db_config: DbConfig,
    row_limit: int | None = None,
) -> tuple[
    dict[str, np.ndarray],
    dict[str, np.ndarray],
    dict[str, np.ndarray],
    dict[str, np.ndarray],
    dict[str, int],
]:
    sequences: dict[str, list[np.ndarray]] = {target_type: [] for target_type in SUPPORTED_TARGET_TYPES}
    contexts: dict[str, list[np.ndarray]] = {target_type: [] for target_type in SUPPORTED_TARGET_TYPES}
    avg_targets: dict[str, list[float]] = {target_type: [] for target_type in SUPPORTED_TARGET_TYPES}
    peak_targets: dict[str, list[float]] = {target_type: [] for target_type in SUPPORTED_TARGET_TYPES}
    dropped_counts = {
        "invalid_target_type": 0,
        "invalid_sequence": 0,
        "invalid_label": 0,
    }

    sql = """
        SELECT
            d.target_type,
            d.input_sequence_json,
            d.target_avg_score_60m,
            d.target_peak_score_60m,
            d.base_timestamp,
            e.start_at,
            e.end_at
        FROM ai_training_dataset d
        LEFT JOIN event_program ep ON ep.program_id = d.program_id
        LEFT JOIN event e ON e.event_id = COALESCE(d.event_id, ep.event_id)
        WHERE JSON_LENGTH(d.input_sequence_json) = %s
        ORDER BY d.training_dataset_id
    """
    params: list[Any] = [SEQUENCE_LENGTH]
    if row_limit and row_limit > 0:
        sql += " LIMIT %s"
        params.append(row_limit)

    connection = pymysql.connect(
        host=db_config.host,
        port=db_config.port,
        user=db_config.user,
        password=db_config.password,
        database=db_config.database,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.SSCursor,
        autocommit=True,
    )

    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            while True:
                batch = cursor.fetchmany(2048)
                if not batch:
                    break

                for row in batch:
                    target_type = str(row[0]).upper() if row[0] else ""
                    if target_type not in SUPPORTED_TARGET_TYPES:
                        dropped_counts["invalid_target_type"] += 1
                        continue

                    sequence = _sanitize_sequence(row[1])
                    if sequence is None:
                        dropped_counts["invalid_sequence"] += 1
                        continue

                    target_avg = _to_float(row[2], default=-1.0)
                    target_peak = _to_float(row[3], default=-1.0)
                    if target_avg < 0.0 or target_peak < 0.0:
                        dropped_counts["invalid_label"] += 1
                        continue

                    context_vector = _build_calendar_feature_vector(
                        base_timestamp=_to_datetime(row[4]),
                        start_at=_to_datetime(row[5]),
                        end_at=_to_datetime(row[6]),
                    )
                    avg_targets[target_type].append(float(np.clip(target_avg, 0.0, 100.0)))
                    peak_targets[target_type].append(float(np.clip(target_peak, 0.0, 100.0)))
                    sequences[target_type].append(sequence)
                    contexts[target_type].append(context_vector)
    finally:
        connection.close()

    sequence_arrays: dict[str, np.ndarray] = {}
    context_arrays: dict[str, np.ndarray] = {}
    avg_arrays: dict[str, np.ndarray] = {}
    peak_arrays: dict[str, np.ndarray] = {}

    for target_type in SUPPORTED_TARGET_TYPES:
        if sequences[target_type]:
            sequence_arrays[target_type] = np.vstack(sequences[target_type]).astype(np.float32)
            context_arrays[target_type] = np.vstack(contexts[target_type]).astype(np.float32)
            avg_arrays[target_type] = np.asarray(avg_targets[target_type], dtype=np.float32)
            peak_arrays[target_type] = np.asarray(peak_targets[target_type], dtype=np.float32)
        else:
            sequence_arrays[target_type] = np.empty((0, SEQUENCE_LENGTH), dtype=np.float32)
            context_arrays[target_type] = np.empty((0, _CALENDAR_FEATURE_COUNT), dtype=np.float32)
            avg_arrays[target_type] = np.empty((0,), dtype=np.float32)
            peak_arrays[target_type] = np.empty((0,), dtype=np.float32)

    for target_type in SUPPORTED_TARGET_TYPES:
        if sequence_arrays[target_type].shape[0] > 0:
            continue

        fallback_sequences, fallback_contexts, fallback_avg, fallback_peak = _fetch_target_rows_from_timeseries(
            db_config=db_config,
            target_type=target_type,
            row_limit=row_limit,
        )
        if fallback_sequences.shape[0] > 0:
            print(
                f"[train] fallback source applied for {target_type}: "
                f"ai_*_congestion_timeseries rows -> {fallback_sequences.shape[0]} samples"
            )
            sequence_arrays[target_type] = fallback_sequences
            context_arrays[target_type] = fallback_contexts
            avg_arrays[target_type] = fallback_avg
            peak_arrays[target_type] = fallback_peak

    return sequence_arrays, context_arrays, avg_arrays, peak_arrays, dropped_counts


def _build_feature_matrix(
    sequence_matrix: np.ndarray,
    context_matrix: np.ndarray | None = None,
) -> np.ndarray:
    if sequence_matrix.size == 0:
        return np.empty((0, SEQUENCE_LENGTH + 18 + _CALENDAR_FEATURE_COUNT), dtype=np.float32)

    n_rows, seq_len = sequence_matrix.shape
    assert seq_len == SEQUENCE_LENGTH

    raw = sequence_matrix
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
    slope = (raw_centered @ x_centered.reshape(seq_len, 1)) / denominator

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

    if context_matrix is None or context_matrix.size == 0:
        context = np.zeros((n_rows, _CALENDAR_FEATURE_COUNT), dtype=np.float32)
    else:
        context = np.asarray(context_matrix, dtype=np.float32)
        if context.ndim != 2 or context.shape[0] != n_rows:
            raise ValueError(
                f"context matrix shape mismatch: expected ({n_rows}, {_CALENDAR_FEATURE_COUNT}), got {context.shape}"
            )
        if context.shape[1] < _CALENDAR_FEATURE_COUNT:
            pad_width = _CALENDAR_FEATURE_COUNT - context.shape[1]
            context = np.pad(context, ((0, 0), (0, pad_width)), mode="constant")
        elif context.shape[1] > _CALENDAR_FEATURE_COUNT:
            context = context[:, :_CALENDAR_FEATURE_COUNT]
        context = np.nan_to_num(context, nan=0.0, posinf=1.0, neginf=0.0).astype(np.float32)

    feature_matrix = np.concatenate([raw, engineered, context], axis=1).astype(np.float32)
    assert feature_matrix.shape[0] == n_rows
    return feature_matrix


def _train_single_target_model(
    X_train: np.ndarray,
    y_train: np.ndarray,
    random_seed: int,
) -> LGBMRegressor:
    model = LGBMRegressor(
        objective="regression",
        n_estimators=280,
        learning_rate=0.05,
        max_depth=8,
        num_leaves=48,
        min_child_samples=40,
        reg_alpha=0.1,
        reg_lambda=0.2,
        subsample=0.9,
        subsample_freq=1,
        colsample_bytree=0.9,
        random_state=random_seed,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    return model


def _train_and_evaluate(
    target_type: str,
    sequence_matrix: np.ndarray,
    context_matrix: np.ndarray,
    target_avg: np.ndarray,
    target_peak: np.ndarray,
    validation_ratio: float,
    random_seed: int,
) -> tuple[dict[str, Any], dict[str, Any]]:
    sample_count = sequence_matrix.shape[0]
    if sample_count < 2:
        raise ValueError(f"{target_type}: not enough samples ({sample_count})")

    feature_matrix = _build_feature_matrix(sequence_matrix, context_matrix=context_matrix)
    rng = np.random.default_rng(random_seed)
    indices = rng.permutation(sample_count)

    train_count = int(round(sample_count * (1.0 - validation_ratio)))
    train_count = min(max(train_count, 1), sample_count - 1)

    train_indices = indices[:train_count]
    valid_indices = indices[train_count:]

    X_train = feature_matrix[train_indices]
    X_valid = feature_matrix[valid_indices]

    seq_valid = sequence_matrix[valid_indices]

    y_avg_train = target_avg[train_indices]
    y_avg_valid = target_avg[valid_indices]
    y_peak_train = target_peak[train_indices]
    y_peak_valid = target_peak[valid_indices]

    model_avg = _train_single_target_model(X_train, y_avg_train, random_seed)
    model_peak = _train_single_target_model(X_train, y_peak_train, random_seed + 1)

    pred_avg = np.clip(model_avg.predict(X_valid), 0.0, 100.0)
    pred_peak = np.clip(model_peak.predict(X_valid), 0.0, 100.0)

    baseline_avg = seq_valid[:, -12:].mean(axis=1)
    baseline_peak = seq_valid.max(axis=1)

    metrics = {
        "sampleCount": int(sample_count),
        "trainCount": int(train_count),
        "validCount": int(sample_count - train_count),
        "featureCount": int(feature_matrix.shape[1]),
        "avgMae": float(mean_absolute_error(y_avg_valid, pred_avg)),
        "avgRmse": float(np.sqrt(mean_squared_error(y_avg_valid, pred_avg))),
        "peakMae": float(mean_absolute_error(y_peak_valid, pred_peak)),
        "peakRmse": float(np.sqrt(mean_squared_error(y_peak_valid, pred_peak))),
        "baselineAvgMae": float(mean_absolute_error(y_avg_valid, baseline_avg)),
        "baselineAvgRmse": float(np.sqrt(mean_squared_error(y_avg_valid, baseline_avg))),
        "baselinePeakMae": float(mean_absolute_error(y_peak_valid, baseline_peak)),
        "baselinePeakRmse": float(np.sqrt(mean_squared_error(y_peak_valid, baseline_peak))),
    }

    artifact_payload = {
        "targetType": target_type,
        "sequenceLength": SEQUENCE_LENGTH,
        "featureVersion": "sequence_plus_stats_calendar_v2",
        "trainedAt": datetime.now().isoformat(),
        "metrics": metrics,
        "modelAvg": model_avg,
        "modelPeak": model_peak,
    }
    return artifact_payload, metrics


def _save_outputs(
    output_dir: Path,
    artifacts: dict[str, dict[str, Any]],
    lstm_artifacts: dict[str, dict[str, Any]],
    report: dict[str, Any],
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    for target_type, artifact_payload in artifacts.items():
        file_path = output_dir / f"{target_type.lower()}_congestion_model.joblib"
        joblib.dump(artifact_payload, file_path)

    for target_type, artifact_payload in lstm_artifacts.items():
        file_path = output_dir / f"{target_type.lower()}_lstm_baseline.joblib"
        joblib.dump(artifact_payload, file_path)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    latest_report_path = output_dir / "training_report_latest.json"
    timestamped_report_path = output_dir / f"training_report_{timestamp}.json"

    latest_report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    timestamped_report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Preprocess ai_training_dataset and train congestion models."
    )
    parser.add_argument("--db-url", default=None, help="JDBC URL (e.g. jdbc:mysql://localhost:3306/pupoodb)")
    parser.add_argument("--db-host", default=None)
    parser.add_argument("--db-port", type=int, default=None)
    parser.add_argument("--db-user", default=None)
    parser.add_argument("--db-password", default=None)
    parser.add_argument("--db-name", default=None)
    parser.add_argument("--limit", type=int, default=0, help="Optional row limit for quick experiments.")
    parser.add_argument("--validation-ratio", type=float, default=0.2)
    parser.add_argument("--random-seed", type=int, default=42)
    parser.add_argument("--min-rows", type=int, default=1000)
    parser.add_argument(
        "--output-dir",
        default=str(_project_root() / "artifacts" / "congestion"),
        help="Output directory for trained model artifacts.",
    )
    return parser


def main() -> None:
    parser = _build_argument_parser()
    args = parser.parse_args()

    if not (0.05 <= args.validation_ratio <= 0.5):
        raise ValueError("--validation-ratio must be between 0.05 and 0.5")

    db_config = _resolve_db_config(args)
    output_dir = Path(args.output_dir).resolve()

    print("[train] loading rows from ai_training_dataset...")
    sequence_data, context_data, avg_data, peak_data, dropped_counts = _fetch_training_rows(
        db_config=db_config,
        row_limit=args.limit if args.limit > 0 else None,
    )

    report: dict[str, Any] = {
        "startedAt": datetime.now().isoformat(),
        "db": {
            "host": db_config.host,
            "port": db_config.port,
            "database": db_config.database,
            "user": db_config.user,
        },
        "options": {
            "limit": args.limit,
            "validationRatio": args.validation_ratio,
            "randomSeed": args.random_seed,
            "minRows": args.min_rows,
            "sequenceLength": SEQUENCE_LENGTH,
        },
        "droppedRows": dropped_counts,
        "targets": {},
    }

    trained_artifacts: dict[str, dict[str, Any]] = {}
    trained_lstm_artifacts: dict[str, dict[str, Any]] = {}

    for target_type in SUPPORTED_TARGET_TYPES:
        sample_count = int(sequence_data[target_type].shape[0])
        print(f"[train] {target_type}: {sample_count} rows")

        if sample_count < args.min_rows:
            report["targets"][target_type] = {
                "status": "skipped",
                "trained": False,
                "reason": f"not enough rows ({sample_count} < {args.min_rows})",
                "artifacts": [],
            }
            continue

        artifact_payload, metrics = _train_and_evaluate(
            target_type=target_type,
            sequence_matrix=sequence_data[target_type],
            context_matrix=context_data[target_type],
            target_avg=avg_data[target_type],
            target_peak=peak_data[target_type],
            validation_ratio=args.validation_ratio,
            random_seed=args.random_seed,
        )
        lstm_artifact_payload, lstm_metrics = train_lstm_calibration_artifact(
            sequence_matrix=sequence_data[target_type],
            target_avg=avg_data[target_type],
            target_type=target_type,
            validation_ratio=args.validation_ratio,
            random_seed=args.random_seed,
        )
        trained_artifacts[target_type] = artifact_payload
        trained_lstm_artifacts[target_type] = lstm_artifact_payload
        report["targets"][target_type] = {
            "status": "trained",
            "trained": True,
            "metrics": metrics,
            "lstmMetrics": lstm_metrics,
            "artifacts": [
                f"{target_type.lower()}_congestion_model.joblib",
                f"{target_type.lower()}_lstm_baseline.joblib",
            ],
        }

    if not trained_artifacts:
        raise RuntimeError("No model trained. Check min_rows or dataset quality.")

    report["finishedAt"] = datetime.now().isoformat()
    _save_outputs(
        output_dir=output_dir,
        artifacts=trained_artifacts,
        lstm_artifacts=trained_lstm_artifacts,
        report=report,
    )

    print(f"[train] completed. output={output_dir}")
    for target_type, payload in trained_artifacts.items():
        metrics = payload["metrics"]
        lstm_metrics = trained_lstm_artifacts[target_type]["metrics"]
        print(
            f"[train] {target_type} avg_mae={metrics['avgMae']:.3f} peak_mae={metrics['peakMae']:.3f} "
            f"avg_rmse={metrics['avgRmse']:.3f} peak_rmse={metrics['peakRmse']:.3f}"
        )
        print(
            f"[train] {target_type} lstm_avg_mae={lstm_metrics['avgMae']:.3f} "
            f"lstm_avg_rmse={lstm_metrics['avgRmse']:.3f}"
        )


if __name__ == "__main__":
    main()
