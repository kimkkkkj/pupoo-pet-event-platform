"""AI prediction log builder."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any


class AiPredictionLogBuilder:
    """Build ai_prediction_logs rows from training dataset rows."""

    def __init__(self, context: Any) -> None:
        self.ctx = context

    def build(
        self,
        training_rows: list[dict[str, Any]],
        event_rows: list[dict[str, Any]],
        program_rows: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        if not training_rows or not event_rows or not program_rows:
            return []

        target_spec = self.ctx.table_target("ai_prediction_logs")
        target_count = int(target_spec["target"])
        sample_count = min(target_count, len(training_rows))
        if sample_count <= 0:
            return []

        event_ts_map = self._build_ts_map(event_rows, "event_id")
        program_ts_map = self._build_ts_map(program_rows, "program_id")
        program_event_map = {row["program_id"]: row["event_id"] for row in program_rows}

        stride = max(1, len(training_rows) // sample_count)
        sampled = [training_rows[idx] for idx in range(0, len(training_rows), stride)]
        if len(sampled) < sample_count:
            sampled.extend(training_rows)

        rows: list[dict[str, Any]] = []
        next_id = 1
        for train_row in sampled:
            if len(rows) >= sample_count:
                break
            base_timestamp = train_row["base_timestamp"]
            if not isinstance(base_timestamp, datetime):
                base_timestamp = datetime.fromisoformat(str(base_timestamp).replace(" ", "T"))
            target_type = train_row["target_type"]
            event_id = train_row["event_id"]
            program_id = train_row["program_id"]

            if target_type == "EVENT":
                if program_id is not None:
                    continue
                if base_timestamp not in event_ts_map.get(event_id, set()):
                    continue
            elif target_type == "PROGRAM":
                if program_id is None:
                    continue
                if program_event_map.get(program_id) != event_id:
                    continue
                if base_timestamp not in program_ts_map.get(program_id, set()):
                    continue
            else:
                continue

            base_avg = float(train_row["target_avg_score_60m"])
            base_peak = float(train_row["target_peak_score_60m"])
            pred_avg = round(max(0.0, base_avg * self.ctx.rng.uniform(0.88, 1.12)), 2)
            pred_peak = round(max(pred_avg, base_peak * self.ctx.rng.uniform(0.90, 1.15)), 2)

            rows.append(
                {
                    "prediction_log_id": next_id,
                    "target_type": target_type,
                    "event_id": event_id,
                    "program_id": program_id,
                    "prediction_base_time": base_timestamp,
                    "predicted_avg_score_60m": pred_avg,
                    "predicted_peak_score_60m": pred_peak,
                    "predicted_level": self._score_to_level(pred_peak),
                    "model_version": self.ctx.rng.choices(
                        ["v1.0.0", "v1.1.0", "v1.2.0"],
                        weights=[20, 55, 25],
                        k=1,
                    )[0],
                    "source_type": self.ctx.rng.choices(
                        ["BATCH", "REALTIME"],
                        weights=[38, 62],
                        k=1,
                    )[0],
                    "created_at": base_timestamp + timedelta(minutes=self.ctx.rng.randint(1, 60)),
                }
            )
            next_id += 1
        return rows

    @staticmethod
    def _score_to_level(score: float) -> int:
        if score < 10:
            return 1
        if score < 20:
            return 2
        if score < 35:
            return 3
        if score < 55:
            return 4
        return 5

    @staticmethod
    def _build_ts_map(rows: list[dict[str, Any]], key: str) -> dict[int, set[datetime]]:
        result: dict[int, set[datetime]] = {}
        for row in rows:
            entity_id = row[key]
            ts = row["timestamp_minute"]
            if not isinstance(ts, datetime):
                ts = datetime.fromisoformat(str(ts).replace(" ", "T"))
            result.setdefault(entity_id, set()).add(ts)
        return result
