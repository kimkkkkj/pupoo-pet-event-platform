"""AI training dataset builder."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime
from typing import Any


class AiTrainingDatasetBuilder:
    """Build sliding-window training dataset rows from AI timeseries."""

    def __init__(self, context: Any) -> None:
        self.ctx = context

    def build(
        self,
        event_rows: list[dict[str, Any]],
        program_rows: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        interval_minutes = max(1, self.ctx.interval_minutes)
        window_minutes = max(10, self.ctx.training_window_minutes)
        input_steps = max(3, window_minutes // interval_minutes)
        target_steps = max(3, window_minutes // interval_minutes)

        target_spec = self.ctx.table_target("ai_training_dataset")
        target_total = int(target_spec["target"])
        target_event = int(target_total * 0.45)
        target_program = max(0, target_total - target_event)

        grouped_event = self._group_sorted(event_rows, "event_id")
        grouped_program = self._group_sorted(program_rows, "program_id")
        event_ts_lookup = {
            entity_id: {self._as_dt(row["timestamp_minute"]) for row in rows}
            for entity_id, rows in grouped_event.items()
        }
        program_ts_lookup = {
            entity_id: {self._as_dt(row["timestamp_minute"]) for row in rows}
            for entity_id, rows in grouped_program.items()
        }
        program_event_map = {row["program_id"]: row["event_id"] for row in program_rows}

        rows: list[dict[str, Any]] = []
        used_keys: set[tuple[Any, Any, Any, Any]] = set()
        next_id = 1

        event_part, next_id = self._build_type_rows(
            grouped=grouped_event,
            target_type="EVENT",
            target_count=target_event,
            input_steps=input_steps,
            target_steps=target_steps,
            next_id=next_id,
            used_keys=used_keys,
            program_event_map=program_event_map,
            timestamp_lookup=event_ts_lookup,
        )
        rows.extend(event_part)

        program_part, next_id = self._build_type_rows(
            grouped=grouped_program,
            target_type="PROGRAM",
            target_count=target_program,
            input_steps=input_steps,
            target_steps=target_steps,
            next_id=next_id,
            used_keys=used_keys,
            program_event_map=program_event_map,
            timestamp_lookup=program_ts_lookup,
        )
        rows.extend(program_part)
        return rows

    def _build_type_rows(
        self,
        grouped: dict[int, list[dict[str, Any]]],
        target_type: str,
        target_count: int,
        input_steps: int,
        target_steps: int,
        next_id: int,
        used_keys: set[tuple[Any, Any, Any, Any]],
        program_event_map: dict[int, int],
        timestamp_lookup: dict[int, set[datetime]],
    ) -> tuple[list[dict[str, Any]], int]:
        rows: list[dict[str, Any]] = []
        if target_count <= 0:
            return rows, next_id

        total_windows = 0
        for series in grouped.values():
            total_windows += max(0, len(series) - (input_steps + target_steps) + 1)
        if total_windows == 0:
            return rows, next_id

        stride = max(1, total_windows // target_count)
        global_seq = 0

        for entity_id, series in grouped.items():
            start_idx = input_steps - 1
            end_idx = len(series) - target_steps - 1
            if end_idx < start_idx:
                continue

            for idx in range(start_idx, end_idx + 1):
                if len(rows) >= target_count:
                    break
                if global_seq % stride != 0:
                    global_seq += 1
                    continue
                global_seq += 1

                base_row = series[idx]
                future_rows = series[idx + 1 : idx + 1 + target_steps]
                input_rows = series[idx - input_steps + 1 : idx + 1]
                base_timestamp = base_row["timestamp_minute"]
                base_timestamp = self._as_dt(base_timestamp)

                if target_type == "EVENT":
                    event_id = entity_id
                    program_id = None
                else:
                    program_id = entity_id
                    event_id = program_event_map.get(program_id)
                    if event_id is None:
                        continue

                entity_ts = timestamp_lookup.get(entity_id, set())
                if base_timestamp not in entity_ts:
                    continue
                if len(input_rows) != input_steps or len(future_rows) != target_steps:
                    continue

                uniq_key = (target_type, event_id, program_id, base_timestamp)
                if uniq_key in used_keys:
                    continue
                used_keys.add(uniq_key)

                target_scores = [float(row["congestion_score"]) for row in future_rows]
                target_avg = round(sum(target_scores) / len(target_scores), 2)
                target_peak = round(max(target_scores), 2)
                if target_peak < target_avg:
                    target_peak = target_avg

                sequence_payload = [
                    {
                        "timestamp": self._fmt_ts(row["timestamp_minute"]),
                        "score": float(row["congestion_score"]),
                        "checkins_1m": int(row.get("checkins_1m", 0)),
                        "checkouts_1m": int(row.get("checkouts_1m", 0)),
                    }
                    for row in input_rows
                ]

                rows.append(
                    {
                        "training_dataset_id": next_id,
                        "target_type": target_type,
                        "event_id": event_id,
                        "program_id": program_id,
                        "base_timestamp": base_timestamp,
                        "input_sequence_json": json.dumps(sequence_payload, ensure_ascii=False),
                        "target_avg_score_60m": target_avg,
                        "target_peak_score_60m": target_peak,
                        "created_at": self.ctx.now,
                    }
                )
                next_id += 1

            if len(rows) >= target_count:
                break

        return rows, next_id

    @staticmethod
    def _group_sorted(rows: list[dict[str, Any]], key: str) -> dict[int, list[dict[str, Any]]]:
        grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
        for row in rows:
            grouped[row[key]].append(row)
        for k in grouped:
            grouped[k].sort(key=lambda x: x["timestamp_minute"])
        return grouped

    @staticmethod
    def _fmt_ts(value: Any) -> str:
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return str(value)

    @staticmethod
    def _as_dt(value: Any) -> datetime:
        if isinstance(value, datetime):
            return value
        return datetime.fromisoformat(str(value).replace(" ", "T"))
