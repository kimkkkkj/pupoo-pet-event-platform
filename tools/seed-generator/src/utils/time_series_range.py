"""Strict timeline range helpers for AI seed generation."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any


def to_datetime(value: Any) -> datetime:
    """Normalize datetime-like value to datetime."""
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace(" ", "T"))


def build_strict_time_range(
    start_at: Any,
    end_at: Any,
    interval_minutes: int,
) -> list[datetime]:
    """Build strict sequential timestamps within inclusive [start_at, end_at]."""
    start_dt = to_datetime(start_at)
    end_dt = to_datetime(end_at)
    step = max(1, int(interval_minutes))
    if end_dt < start_dt:
        return []

    timeline: list[datetime] = []
    current = start_dt
    delta = timedelta(minutes=step)
    while current <= end_dt:
        timeline.append(current)
        current += delta
    return timeline


def assert_strict_time_bounds(
    timeline: list[datetime],
    start_at: Any,
    end_at: Any,
    entity_kind: str,
    entity_id: int,
) -> None:
    """Raise if timeline includes timestamp outside [start_at, end_at]."""
    if not timeline:
        return
    start_dt = to_datetime(start_at)
    end_dt = to_datetime(end_at)
    min_ts = min(timeline)
    max_ts = max(timeline)

    if min_ts < start_dt:
        raise ValueError(
            f"{entity_kind}_id={entity_id} generated min timestamp {min_ts} "
            f"is earlier than actual start_at {start_dt}"
        )
    if max_ts > end_dt:
        raise ValueError(
            f"{entity_kind}_id={entity_id} generated max timestamp {max_ts} "
            f"exceeds actual end_at {end_dt}"
        )
    for ts in timeline:
        if ts < start_dt or ts > end_dt:
            raise ValueError(
                f"{entity_kind}_id={entity_id} generated timestamp {ts} "
                f"is out of actual range {start_dt}~{end_dt}"
            )
