"""AI event-level congestion timeseries builder."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime
from typing import Any

from src.utils.time_series_range import (
    assert_strict_time_bounds,
    build_strict_time_range,
    to_datetime,
)


class AiEventTimeseriesBuilder:
    """Build sequential event-level congestion rows from operational context."""

    def __init__(self, context: Any) -> None:
        self.ctx = context

    def build(self, operational_data: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
        events = operational_data.get("event", [])
        event_applies = operational_data.get("event_apply", [])
        programs = operational_data.get("event_program", [])
        booths = operational_data.get("booths", [])
        booth_waits = operational_data.get("booth_waits", [])
        experience_waits = operational_data.get("experience_waits", [])
        congestions = operational_data.get("congestions", [])
        qr_codes = operational_data.get("qr_codes", [])
        qr_logs = operational_data.get("qr_logs", [])

        interval = self.ctx.interval_minutes

        apply_count_by_event = Counter(
            row["event_id"] for row in event_applies if row.get("status") in {"APPLIED", "APPROVED"}
        )
        programs_by_event: dict[int, list[dict[str, Any]]] = defaultdict(list)
        for row in programs:
            programs_by_event[row["event_id"]].append(row)

        booth_event_map = {row["booth_id"]: row["event_id"] for row in booths}
        wait_sum_by_event: dict[int, int] = defaultdict(int)
        wait_avg_by_event: dict[int, float] = defaultdict(float)
        wait_count_by_event: dict[int, int] = defaultdict(int)
        for row in booth_waits:
            event_id = booth_event_map.get(row["booth_id"])
            if event_id is None:
                continue
            wait_sum_by_event[event_id] += int(row.get("wait_count") or 0)
            wait_avg_by_event[event_id] += float(row.get("wait_min") or 0)
            wait_count_by_event[event_id] += 1

        program_event_map = {row["program_id"]: row["event_id"] for row in programs}
        for row in experience_waits:
            event_id = program_event_map.get(row["program_id"])
            if event_id is None:
                continue
            wait_sum_by_event[event_id] += int(row.get("wait_count") or 0)
            wait_avg_by_event[event_id] += float(row.get("wait_min") or 0)
            wait_count_by_event[event_id] += 1

        congestion_level_by_event: dict[int, list[int]] = defaultdict(list)
        for row in congestions:
            event_id = program_event_map.get(row["program_id"])
            if event_id is None:
                continue
            congestion_level_by_event[event_id].append(int(row.get("congestion_level") or 0))

        qr_event_map = {row["qr_id"]: row["event_id"] for row in qr_codes}
        qr_checkin_by_event_ts: Counter[tuple[int, datetime]] = Counter()
        qr_checkout_by_event_ts: Counter[tuple[int, datetime]] = Counter()
        for row in qr_logs:
            event_id = qr_event_map.get(row["qr_id"])
            if event_id is None:
                continue
            checked_at = to_datetime(row["checked_at"])
            bucket = self._floor_to_interval(checked_at, interval)
            if row.get("check_type") == "CHECKIN":
                qr_checkin_by_event_ts[(event_id, bucket)] += 1
            else:
                qr_checkout_by_event_ts[(event_id, bucket)] += 1

        rows: list[dict[str, Any]] = []
        next_id = 1
        debug_samples: list[str] = []
        for event in events:
            if event["status"] == "PLANNED":
                continue
            event_id = event["event_id"]
            event_start = to_datetime(event["start_at"])
            event_end = to_datetime(event["end_at"])

            timeline = build_strict_time_range(
                start_at=event_start,
                end_at=event_end,
                interval_minutes=interval,
            )
            if not timeline:
                continue
            assert_strict_time_bounds(
                timeline=timeline,
                start_at=event_start,
                end_at=event_end,
                entity_kind="event",
                entity_id=int(event_id),
            )
            if len(set(timeline)) != len(timeline):
                raise ValueError(f"event_id={event_id} generated duplicated timestamps in timeline")

            if len(debug_samples) < 5:
                debug_samples.append(
                    f"[ai-debug:event] event_id={event_id} "
                    f"actual_start={event_start} actual_end={event_end} "
                    f"generated_min={timeline[0]} generated_max={timeline[-1]} "
                    f"interval_minutes={interval} generated_rows={len(timeline)}"
                )

            apply_base = max(1, apply_count_by_event.get(event_id, 0))
            wait_total_base = wait_sum_by_event.get(event_id, 0)
            wait_avg_base = (
                wait_avg_by_event[event_id] / wait_count_by_event[event_id]
                if wait_count_by_event[event_id]
                else 0.0
            )
            congestion_base = (
                sum(congestion_level_by_event[event_id]) / len(congestion_level_by_event[event_id])
                if congestion_level_by_event[event_id]
                else 0.0
            )
            event_programs = programs_by_event.get(event_id, [])

            for ts in timeline:
                running_program_count = sum(
                    1
                    for program in event_programs
                    if to_datetime(program["start_at"]) <= ts <= to_datetime(program["end_at"])
                )
                hour_factor = self._hour_factor(ts.hour)
                weekend_factor = 1.1 if ts.isoweekday() in {6, 7} else 1.0

                checkins = qr_checkin_by_event_ts.get((event_id, ts), 0)
                checkouts = qr_checkout_by_event_ts.get((event_id, ts), 0)
                if checkins == 0:
                    checkins = int(
                        max(
                            0,
                            apply_base * 0.006 * hour_factor * weekend_factor
                            + self.ctx.rng.uniform(-1.2, 2.2),
                        )
                    )
                if checkouts == 0:
                    checkouts = int(
                        max(
                            0,
                            apply_base * 0.005 * self._hour_factor((ts.hour - 1) % 24)
                            + self.ctx.rng.uniform(-1.0, 1.8),
                        )
                    )

                total_wait_count = int(
                    max(0, wait_total_base * (0.45 + hour_factor * 0.65) + self.ctx.rng.uniform(-6, 9))
                )
                avg_wait_min = max(
                    0.0,
                    wait_avg_base * (0.60 + hour_factor * 0.45) + self.ctx.rng.uniform(-1.5, 2.5),
                )
                progress_minute = max(0, int((ts - event_start).total_seconds() // 60))

                score = (
                    checkins * 1.6
                    + checkouts * 1.1
                    + total_wait_count * 0.08
                    + running_program_count * 1.9
                    + avg_wait_min * 0.7
                    + congestion_base * 2.3
                ) / 10.0

                rows.append(
                    {
                        "event_timeseries_id": next_id,
                        "event_id": event_id,
                        "timestamp_minute": ts,
                        "checkins_1m": int(max(0, checkins)),
                        "checkouts_1m": int(max(0, checkouts)),
                        "active_apply_count": int(max(0, apply_base)),
                        "total_wait_count": int(max(0, total_wait_count)),
                        "avg_wait_min": round(max(0.0, avg_wait_min), 2),
                        "running_program_count": int(max(0, running_program_count)),
                        "progress_minute": progress_minute,
                        "hour_of_day": ts.hour,
                        "day_of_week": ts.isoweekday(),
                        "congestion_score": round(max(0.0, score), 2),
                        "created_at": self.ctx.now,
                        "updated_at": self.ctx.now,
                    }
                )
                next_id += 1

        for line in debug_samples:
            print(line)
        return rows

    @staticmethod
    def _floor_to_interval(value: datetime, interval_minutes: int) -> datetime:
        minute = (value.minute // interval_minutes) * interval_minutes
        return value.replace(minute=minute, second=0, microsecond=0)

    @staticmethod
    def _hour_factor(hour: int) -> float:
        if 0 <= hour <= 7:
            return 0.07
        if hour == 8:
            return 0.20
        if 9 <= hour <= 11:
            return 0.56
        if 12 <= hour <= 13:
            return 0.40
        if 14 <= hour <= 16:
            return 0.96
        if 17 <= hour <= 18:
            return 0.63
        if 19 <= hour <= 21:
            return 0.22
        return 0.10
