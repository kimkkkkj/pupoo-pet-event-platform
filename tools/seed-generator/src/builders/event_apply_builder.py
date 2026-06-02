"""event_apply builder."""

from __future__ import annotations

from collections import Counter
from datetime import timedelta
from typing import Any


class EventApplyBuilder:
    """Generate event applications with event-scale differences."""

    def __init__(self, context: Any) -> None:
        self.ctx = context

    def build(self, users: list[dict[str, Any]], events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        user_ids = [u["user_id"] for u in users if u["role_name"] == "USER"]
        if not user_ids:
            return []

        rows: list[dict[str, Any]] = []
        apply_counts: Counter[int] = Counter()

        for event in events:
            event_id = event["event_id"]
            event_scale = getattr(self.ctx, "event_scale_by_id", {}).get(event_id, "S")
            status = event["status"]

            if event_scale == "L":
                target = self.ctx.rng.randint(2500, 3200)
            elif event_scale == "M":
                target = self.ctx.rng.randint(1600, 2300)
            else:
                target = self.ctx.rng.randint(900, 1400)

            if status == "PLANNED":
                target = int(target * 0.7)

            target = min(target, len(user_ids))
            selected_users = self.ctx.rng.sample(user_ids, target)
            for user_id in selected_users:
                apply_status = self.ctx.rng.choices(
                    ["APPROVED", "APPLIED", "CANCELLED", "REJECTED"],
                    weights=[76, 16, 5, 3],
                    k=1,
                )[0]
                applied_at = self._pick_applied_at(event)
                rows.append(
                    {
                        "apply_id": self.ctx.next_id("event_apply"),
                        "user_id": user_id,
                        "event_id": event_id,
                        "applied_at": applied_at,
                        "status": apply_status,
                    }
                )
                apply_counts[event_id] += 1

        self.ctx.apply_count_by_event = dict(apply_counts)
        return rows

    def _pick_applied_at(self, event: dict[str, Any]):
        start_at = event["start_at"]
        if event["status"] == "PLANNED":
            return start_at - timedelta(days=self.ctx.rng.randint(5, 45))
        if event["status"] == "ONGOING":
            return start_at - timedelta(days=self.ctx.rng.randint(3, 25))
        return start_at - timedelta(days=self.ctx.rng.randint(10, 40))
