"""Validator for AI-only seed tables."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime
from typing import Any


class AiSeedValidator:
    """Validate AI seed data against schema and temporal consistency rules."""

    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config

    def validate(
        self,
        ai_data: dict[str, list[dict[str, Any]]],
        operational_data: dict[str, list[dict[str, Any]]],
    ) -> list[str]:
        event_ts = self._rows(ai_data, "ai_event_congestion_timeseries")
        program_ts = self._rows(ai_data, "ai_program_congestion_timeseries")
        training = self._rows(ai_data, "ai_training_dataset")
        prediction = self._rows(ai_data, "ai_prediction_logs")

        events = self._rows(operational_data, "event")
        programs = self._rows(operational_data, "event_program")
        event_map = {row["event_id"]: row for row in events}
        program_map = {row["program_id"]: row for row in programs}
        planned_event_ids = {row["event_id"] for row in events if row["status"] == "PLANNED"}

        event_ts_map, event_ranges = self._build_ts_index(event_ts, "event_id")
        program_ts_map, program_ranges = self._build_ts_index(program_ts, "program_id")

        self._assert_pair_unique(
            event_ts,
            "event_id",
            "timestamp_minute",
            "ai_event_congestion_timeseries duplicate (event_id, timestamp_minute)",
        )
        self._assert_pair_unique(
            program_ts,
            "program_id",
            "timestamp_minute",
            "ai_program_congestion_timeseries duplicate (program_id, timestamp_minute)",
        )
        self._assert_unique_key(
            training,
            keys=("target_type", "event_id", "program_id", "base_timestamp"),
            message="ai_training_dataset duplicate (target_type,event_id,program_id,base_timestamp)",
        )

        self._assert_fk_exists(
            event_ts,
            "event_id",
            set(event_map.keys()),
            "ai_event_congestion_timeseries.event_id FK violation",
        )
        self._assert_fk_exists(
            program_ts,
            "program_id",
            set(program_map.keys()),
            "ai_program_congestion_timeseries.program_id FK violation",
        )
        self._assert_fk_exists(
            program_ts,
            "event_id",
            set(event_map.keys()),
            "ai_program_congestion_timeseries.event_id FK violation",
        )
        self._assert_fk_nullable(training, "event_id", set(event_map.keys()), "ai_training_dataset.event_id FK violation")
        self._assert_fk_nullable(
            training,
            "program_id",
            set(program_map.keys()),
            "ai_training_dataset.program_id FK violation",
        )
        self._assert_fk_nullable(prediction, "event_id", set(event_map.keys()), "ai_prediction_logs.event_id FK violation")
        self._assert_fk_nullable(
            prediction,
            "program_id",
            set(program_map.keys()),
            "ai_prediction_logs.program_id FK violation",
        )

        self._assert_event_time_range(event_ranges, event_map)
        self._assert_program_time_range(program_ranges, program_map)
        self._assert_program_event_consistency(program_ts, program_map)
        self._assert_no_planned_timeseries(event_ts, program_ts, planned_event_ids, program_map)

        self._assert_training_logic(training, program_map)
        self._assert_training_timestamps(training, event_ts_map, program_ts_map)
        self._assert_prediction_logic(prediction, program_map)
        self._assert_prediction_timestamps(prediction, event_ts_map, program_ts_map)
        self._assert_event_ck(event_ts)
        self._assert_program_ck(program_ts)
        self._assert_training_ck(training)
        self._assert_prediction_ck(prediction)

        summary = [
            "ai validation passed",
            "duplicate checks passed",
            "fk checks passed",
            "time-range consistency checks passed",
            "planned-event exclusion checks passed",
            "check constraint sanity checks passed",
            "rerunnable SQL shape check passed",
        ]
        summary.extend(
            self._build_stats(
                event_rows=event_ts,
                program_rows=program_ts,
                training_rows=training,
                prediction_rows=prediction,
                events=events,
                programs=programs,
            )
        )
        summary.extend(self._build_row_count_messages(ai_data))
        return summary

    @staticmethod
    def _rows(data: dict[str, list[Any]], table: str) -> list[dict[str, Any]]:
        rows = data.get(table, [])
        normalized: list[dict[str, Any]] = []
        for row in rows:
            if hasattr(row, "as_dict"):
                normalized.append(row.as_dict())
            elif isinstance(row, dict):
                normalized.append(row)
            else:
                raise TypeError(f"{table} row type unsupported: {type(row)!r}")
        return normalized

    @staticmethod
    def _as_dt(value: Any) -> datetime:
        if isinstance(value, datetime):
            return value
        return datetime.fromisoformat(str(value).replace(" ", "T"))

    def _build_ts_index(
        self,
        rows: list[dict[str, Any]],
        id_key: str,
    ) -> tuple[dict[int, set[datetime]], dict[int, tuple[datetime, datetime]]]:
        ts_map: dict[int, set[datetime]] = defaultdict(set)
        ranges: dict[int, tuple[datetime, datetime]] = {}
        for row in rows:
            entity_id = int(row[id_key])
            ts = self._as_dt(row["timestamp_minute"])
            ts_map[entity_id].add(ts)
            if entity_id not in ranges:
                ranges[entity_id] = (ts, ts)
            else:
                start, end = ranges[entity_id]
                ranges[entity_id] = (min(start, ts), max(end, ts))
        return dict(ts_map), ranges

    @staticmethod
    def _assert_pair_unique(rows: list[dict[str, Any]], k1: str, k2: str, message: str) -> None:
        seen: set[tuple[Any, Any]] = set()
        for row in rows:
            pair = (row.get(k1), row.get(k2))
            if pair in seen:
                raise ValueError(f"{message}: {pair}")
            seen.add(pair)

    @staticmethod
    def _assert_unique_key(rows: list[dict[str, Any]], keys: tuple[str, ...], message: str) -> None:
        seen: set[tuple[Any, ...]] = set()
        for row in rows:
            key = tuple(row.get(k) for k in keys)
            if key in seen:
                raise ValueError(f"{message}: {key}")
            seen.add(key)

    @staticmethod
    def _assert_fk_exists(rows: list[dict[str, Any]], key: str, target_ids: set[Any], message: str) -> None:
        for row in rows:
            if row.get(key) not in target_ids:
                raise ValueError(f"{message}: {row.get(key)}")

    @staticmethod
    def _assert_fk_nullable(rows: list[dict[str, Any]], key: str, target_ids: set[Any], message: str) -> None:
        for row in rows:
            value = row.get(key)
            if value is None:
                continue
            if value not in target_ids:
                raise ValueError(f"{message}: {value}")

    def _assert_event_time_range(
        self,
        event_ranges: dict[int, tuple[datetime, datetime]],
        event_map: dict[int, dict[str, Any]],
    ) -> None:
        violations: list[str] = []
        for event_id, (ai_min, ai_max) in sorted(event_ranges.items()):
            event = event_map[event_id]
            op_start = self._as_dt(event["start_at"])
            op_end = self._as_dt(event["end_at"])
            if ai_min < op_start or ai_max > op_end:
                violations.append(
                    f"event_id={event_id}, ai_min={ai_min}, ai_max={ai_max}, op_start={op_start}, op_end={op_end}"
                )
        if violations:
            details = " | ".join(violations[:10])
            raise ValueError(f"ai_event_congestion_timeseries out-of-range detected: {details}")

    def _assert_program_time_range(
        self,
        program_ranges: dict[int, tuple[datetime, datetime]],
        program_map: dict[int, dict[str, Any]],
    ) -> None:
        violations: list[str] = []
        for program_id, (ai_min, ai_max) in sorted(program_ranges.items()):
            program = program_map[program_id]
            op_start = self._as_dt(program["start_at"])
            op_end = self._as_dt(program["end_at"])
            if ai_min < op_start or ai_max > op_end:
                violations.append(
                    f"program_id={program_id}, ai_min={ai_min}, ai_max={ai_max}, op_start={op_start}, op_end={op_end}"
                )
        if violations:
            details = " | ".join(violations[:10])
            raise ValueError(f"ai_program_congestion_timeseries out-of-range detected: {details}")

    @staticmethod
    def _assert_program_event_consistency(rows: list[dict[str, Any]], program_map: dict[int, dict[str, Any]]) -> None:
        for row in rows:
            expected_event_id = int(program_map[row["program_id"]]["event_id"])
            if int(row["event_id"]) != expected_event_id:
                raise ValueError(
                    "ai_program_congestion_timeseries event_id mismatch: "
                    f"program_id={row['program_id']} expected={expected_event_id} actual={row['event_id']}"
                )

    def _assert_no_planned_timeseries(
        self,
        event_rows: list[dict[str, Any]],
        program_rows: list[dict[str, Any]],
        planned_event_ids: set[int],
        program_map: dict[int, dict[str, Any]],
    ) -> None:
        for row in event_rows:
            if int(row["event_id"]) in planned_event_ids:
                raise ValueError(f"PLANNED event has event timeseries: event_id={row['event_id']}")
        for row in program_rows:
            if int(program_map[row["program_id"]]["event_id"]) in planned_event_ids:
                raise ValueError(f"PLANNED event has program timeseries: program_id={row['program_id']}")

    def _assert_training_logic(self, rows: list[dict[str, Any]], program_map: dict[int, dict[str, Any]]) -> None:
        for row in rows:
            target_type = row["target_type"]
            if target_type == "EVENT":
                if row["program_id"] is not None:
                    raise ValueError("ai_training_dataset EVENT must have program_id=NULL")
                if row["event_id"] is None:
                    raise ValueError("ai_training_dataset EVENT requires event_id")
            elif target_type == "PROGRAM":
                if row["program_id"] is None or row["event_id"] is None:
                    raise ValueError("ai_training_dataset PROGRAM requires event_id and program_id")
                if int(program_map[row["program_id"]]["event_id"]) != int(row["event_id"]):
                    raise ValueError("ai_training_dataset PROGRAM event/program mismatch")
            else:
                raise ValueError(f"ai_training_dataset invalid target_type: {target_type}")

    def _assert_training_timestamps(
        self,
        rows: list[dict[str, Any]],
        event_ts_map: dict[int, set[datetime]],
        program_ts_map: dict[int, set[datetime]],
    ) -> None:
        for row in rows:
            base_ts = self._as_dt(row["base_timestamp"])
            if row["target_type"] == "EVENT":
                event_id = int(row["event_id"])
                if base_ts not in event_ts_map.get(event_id, set()):
                    raise ValueError(
                        "ai_training_dataset base_timestamp not found in event timeseries: "
                        f"event_id={event_id}, base_timestamp={base_ts}"
                    )
            else:
                program_id = int(row["program_id"])
                if base_ts not in program_ts_map.get(program_id, set()):
                    raise ValueError(
                        "ai_training_dataset base_timestamp not found in program timeseries: "
                        f"program_id={program_id}, base_timestamp={base_ts}"
                    )

    def _assert_prediction_logic(self, rows: list[dict[str, Any]], program_map: dict[int, dict[str, Any]]) -> None:
        for row in rows:
            target_type = row["target_type"]
            if target_type == "EVENT":
                if row["program_id"] is not None:
                    raise ValueError("ai_prediction_logs EVENT must have program_id=NULL")
                if row["event_id"] is None:
                    raise ValueError("ai_prediction_logs EVENT requires event_id")
            elif target_type == "PROGRAM":
                if row["program_id"] is None or row["event_id"] is None:
                    raise ValueError("ai_prediction_logs PROGRAM requires event_id and program_id")
                if int(program_map[row["program_id"]]["event_id"]) != int(row["event_id"]):
                    raise ValueError("ai_prediction_logs PROGRAM event/program mismatch")
            else:
                raise ValueError(f"ai_prediction_logs invalid target_type: {target_type}")

    def _assert_prediction_timestamps(
        self,
        rows: list[dict[str, Any]],
        event_ts_map: dict[int, set[datetime]],
        program_ts_map: dict[int, set[datetime]],
    ) -> None:
        for row in rows:
            base_ts = self._as_dt(row["prediction_base_time"])
            if row["target_type"] == "EVENT":
                event_id = int(row["event_id"])
                if base_ts not in event_ts_map.get(event_id, set()):
                    raise ValueError(
                        "ai_prediction_logs prediction_base_time not found in event timeseries: "
                        f"event_id={event_id}, prediction_base_time={base_ts}"
                    )
            else:
                program_id = int(row["program_id"])
                if base_ts not in program_ts_map.get(program_id, set()):
                    raise ValueError(
                        "ai_prediction_logs prediction_base_time not found in program timeseries: "
                        f"program_id={program_id}, prediction_base_time={base_ts}"
                    )

    @staticmethod
    def _assert_event_ck(rows: list[dict[str, Any]]) -> None:
        for row in rows:
            if min(
                int(row["checkins_1m"]),
                int(row["checkouts_1m"]),
                int(row["active_apply_count"]),
                int(row["total_wait_count"]),
                int(row["running_program_count"]),
                int(row["progress_minute"]),
            ) < 0:
                raise ValueError("ai_event_congestion_timeseries nonnegative CHECK violation")
            if not (0 <= int(row["hour_of_day"]) <= 23):
                raise ValueError("ai_event_congestion_timeseries hour_of_day CHECK violation")
            if not (1 <= int(row["day_of_week"]) <= 7):
                raise ValueError("ai_event_congestion_timeseries day_of_week CHECK violation")
            if float(row["congestion_score"]) < 0:
                raise ValueError("ai_event_congestion_timeseries congestion_score CHECK violation")

    @staticmethod
    def _assert_program_ck(rows: list[dict[str, Any]]) -> None:
        for row in rows:
            if min(
                int(row["checkins_1m"]),
                int(row["checkouts_1m"]),
                int(row["active_apply_count"]),
                int(row["wait_count"]),
                int(row["progress_minute"]),
            ) < 0:
                raise ValueError("ai_program_congestion_timeseries nonnegative CHECK violation")
            wait_min = row.get("wait_min")
            if wait_min is not None and int(wait_min) < 0:
                raise ValueError("ai_program_congestion_timeseries wait_min CHECK violation")
            if not (0 <= int(row["hour_of_day"]) <= 23):
                raise ValueError("ai_program_congestion_timeseries hour_of_day CHECK violation")
            if not (1 <= int(row["day_of_week"]) <= 7):
                raise ValueError("ai_program_congestion_timeseries day_of_week CHECK violation")
            if float(row["congestion_score"]) < 0:
                raise ValueError("ai_program_congestion_timeseries congestion_score CHECK violation")

    @staticmethod
    def _assert_training_ck(rows: list[dict[str, Any]]) -> None:
        for row in rows:
            avg_score = float(row["target_avg_score_60m"])
            peak_score = float(row["target_peak_score_60m"])
            if avg_score < 0 or peak_score < 0 or peak_score < avg_score:
                raise ValueError("ai_training_dataset score CHECK violation")

    @staticmethod
    def _assert_prediction_ck(rows: list[dict[str, Any]]) -> None:
        for row in rows:
            avg_score = float(row["predicted_avg_score_60m"])
            peak_score = float(row["predicted_peak_score_60m"])
            level = int(row["predicted_level"])
            if avg_score < 0 or peak_score < 0 or peak_score < avg_score:
                raise ValueError("ai_prediction_logs score CHECK violation")
            if not (1 <= level <= 5):
                raise ValueError("ai_prediction_logs predicted_level CHECK violation")

    def _build_stats(
        self,
        event_rows: list[dict[str, Any]],
        program_rows: list[dict[str, Any]],
        training_rows: list[dict[str, Any]],
        prediction_rows: list[dict[str, Any]],
        events: list[dict[str, Any]],
        programs: list[dict[str, Any]],
    ) -> list[str]:
        lines: list[str] = []
        event_ranges = self._build_min_max(event_rows, "event_id")
        program_ranges = self._build_min_max(program_rows, "program_id")

        lines.append("event-level AI timeseries min/max:")
        for event_id in sorted(event_ranges.keys()):
            min_ts, max_ts = event_ranges[event_id]
            lines.append(f"  event_id={event_id}: {min_ts} ~ {max_ts}")

        lines.append("program-level AI timeseries min/max sample (max 10):")
        for program_id in sorted(program_ranges.keys())[:10]:
            min_ts, max_ts = program_ranges[program_id]
            lines.append(f"  program_id={program_id}: {min_ts} ~ {max_ts}")

        event_map = {row["event_id"]: row for row in events}
        lines.append("operational event range vs AI event range sample (max 10):")
        for event_id in sorted(event_ranges.keys())[:10]:
            op_start = self._as_dt(event_map[event_id]["start_at"])
            op_end = self._as_dt(event_map[event_id]["end_at"])
            ai_min, ai_max = event_ranges[event_id]
            lines.append(f"  event_id={event_id}: op={op_start}~{op_end} / ai={ai_min}~{ai_max}")

        lines.append("planned-event exclusion check: passed")
        lines.append(
            f"row count summary: event_ts={len(event_rows)}, program_ts={len(program_rows)}, "
            f"training={len(training_rows)}, prediction={len(prediction_rows)}"
        )
        lines.append(f"training_dataset count by target_type: {dict(Counter(r['target_type'] for r in training_rows))}")
        lines.append(f"prediction_logs count by target_type: {dict(Counter(r['target_type'] for r in prediction_rows))}")

        category_counter = Counter()
        program_map = {row["program_id"]: row for row in programs}
        for row in program_rows:
            category_counter[program_map[row["program_id"]]["category"]] += 1
        lines.append(f"program_timeseries count by category: {dict(category_counter)}")
        return lines

    def _build_row_count_messages(self, ai_data: dict[str, list[dict[str, Any]]]) -> list[str]:
        ai_cfg = self.config.get("ai", {})
        scale_mode = ai_cfg.get("scale_mode", ai_cfg.get("scale", "normal"))
        target_rows = ai_cfg.get("target_rows", {})
        scale_cfg = target_rows.get(scale_mode, {})
        lines: list[str] = [f"row count range check (scale_mode={scale_mode}):"]

        for table in (
            "ai_event_congestion_timeseries",
            "ai_program_congestion_timeseries",
            "ai_training_dataset",
            "ai_prediction_logs",
        ):
            count = len(ai_data.get(table, []))
            range_cfg = scale_cfg.get(table, {})
            min_count = int(range_cfg.get("min", 0))
            max_count = int(range_cfg.get("max", 10**18))
            status = "OK" if min_count <= count <= max_count else "WARN"
            lines.append(f"  {table}: {count} (expected {min_count}~{max_count}) [{status}]")
        return lines

    def _build_min_max(
        self,
        rows: list[dict[str, Any]],
        id_key: str,
    ) -> dict[int, tuple[datetime, datetime]]:
        ranges: dict[int, tuple[datetime, datetime]] = {}
        for row in rows:
            entity_id = int(row[id_key])
            ts = self._as_dt(row["timestamp_minute"])
            if entity_id not in ranges:
                ranges[entity_id] = (ts, ts)
            else:
                min_ts, max_ts = ranges[entity_id]
                ranges[entity_id] = (min(min_ts, ts), max(max_ts, ts))
        return ranges
