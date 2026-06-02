"""qr_codes/qr_logs builder."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import timedelta
from typing import Any

from src.utils.url_builder import build_qr_path


class QrBuilder:
    """Generate QR issuance and logs with basic time-flow realism."""

    def __init__(self, context: Any) -> None:
        self.ctx = context

    def build(
        self,
        event_applies: list[dict[str, Any]],
        events: list[dict[str, Any]],
        booths: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        event_map = {e["event_id"]: e for e in events}
        booths_by_event: dict[int, list[int]] = defaultdict(list)
        for booth in booths:
            booths_by_event[booth["event_id"]].append(booth["booth_id"])

        qr_codes: list[dict[str, Any]] = []
        qr_logs: list[dict[str, Any]] = []
        qr_count_by_event: Counter[int] = Counter()
        log_count_by_event: Counter[int] = Counter()

        for apply_row in event_applies:
            if apply_row["status"] not in {"APPROVED", "APPLIED"}:
                continue
            event = event_map[apply_row["event_id"]]
            if self.ctx.rng.random() > 0.92:
                continue

            qr_id = self.ctx.next_id("qr_codes")
            qr_codes.append(
                {
                    "qr_id": qr_id,
                    "user_id": apply_row["user_id"],
                    "event_id": apply_row["event_id"],
                    "original_url": build_qr_path(apply_row["event_id"], apply_row["user_id"]),
                    "mime_type": "png",
                    "issued_at": apply_row["applied_at"] + timedelta(hours=self.ctx.rng.randint(1, 72)),
                    "expired_at": event["end_at"],
                }
            )
            qr_count_by_event[apply_row["event_id"]] += 1

            if event["status"] == "PLANNED":
                continue
            event_booths = booths_by_event.get(event["event_id"], [])
            if not event_booths:
                continue

            log_rows = self._build_logs_for_qr(qr_id=qr_id, event=event, event_booths=event_booths)
            qr_logs.extend(log_rows)
            log_count_by_event[event["event_id"]] += len(log_rows)

        self.ctx.qr_count_by_event = dict(qr_count_by_event)
        self.ctx.qr_log_count_by_event = dict(log_count_by_event)
        return qr_codes, qr_logs

    def _build_logs_for_qr(self, qr_id: int, event: dict[str, Any], event_booths: list[int]) -> list[dict[str, Any]]:
        if self.ctx.rng.random() > 0.75:
            return []

        # Time pattern: morning low -> noon dip -> afternoon peak.
        hour_candidates = [9, 10, 11, 12, 13, 14, 15, 16, 17]
        hour_weights = [4, 7, 10, 6, 9, 12, 13, 8, 5]
        checkin_hour = self.ctx.rng.choices(hour_candidates, weights=hour_weights, k=1)[0]
        day_span = max(0, (event["end_at"].date() - event["start_at"].date()).days)
        day_offset = self.ctx.rng.randint(0, max(0, min(day_span, 2)))

        checkin_at = event["start_at"].replace(hour=checkin_hour, minute=self.ctx.rng.randint(0, 59), second=0)
        checkin_at = checkin_at + timedelta(days=day_offset)
        if checkin_at > event["end_at"]:
            checkin_at = event["start_at"] + timedelta(hours=2)

        checkin_booth = self.ctx.rng.choice(event_booths)
        rows: list[dict[str, Any]] = [
            {
                "log_id": self.ctx.next_id("qr_logs"),
                "qr_id": qr_id,
                "booth_id": checkin_booth,
                "check_type": "CHECKIN",
                "checked_at": checkin_at,
            }
        ]

        if self.ctx.rng.random() < 0.68:
            checkout_at = checkin_at + timedelta(minutes=self.ctx.rng.randint(40, 240))
            if checkout_at <= event["end_at"]:
                rows.append(
                    {
                        "log_id": self.ctx.next_id("qr_logs"),
                        "qr_id": qr_id,
                        "booth_id": self.ctx.rng.choice(event_booths),
                        "check_type": "CHECKOUT",
                        "checked_at": checkout_at,
                    }
                )
        return rows
