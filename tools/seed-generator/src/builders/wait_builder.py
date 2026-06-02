"""booth/experience wait builder."""

from __future__ import annotations

from collections import defaultdict
from typing import Any


class WaitBuilder:
    """Generate wait snapshots for booths and experience programs."""

    def __init__(self, context: Any) -> None:
        self.ctx = context

    def build(
        self,
        booths: list[dict[str, Any]],
        programs: list[dict[str, Any]],
        events: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        scale_by_event = getattr(self.ctx, "event_scale_by_id", {})
        program_by_id = {p["program_id"]: p for p in programs}
        booth_by_id = {b["booth_id"]: b for b in booths}

        booth_waits: list[dict[str, Any]] = []
        for booth in booths:
            scale = scale_by_event.get(booth["event_id"], "S")
            base = {"L": (18, 75), "M": (10, 48), "S": (3, 28)}[scale]
            wait_count = self.ctx.rng.randint(base[0], base[1])
            booth_waits.append(
                {
                    "wait_id": self.ctx.next_id("booth_waits"),
                    "booth_id": booth["booth_id"],
                    "wait_count": wait_count,
                    "wait_min": max(3, int(wait_count * self.ctx.rng.uniform(0.45, 0.8))),
                    "updated_at": self.ctx.now,
                }
            )

        experience_waits: list[dict[str, Any]] = []
        for program in programs:
            if program["category"] != "EXPERIENCE":
                continue
            scale = scale_by_event.get(program["event_id"], "S")
            base = {"L": (12, 66), "M": (8, 42), "S": (3, 24)}[scale]
            wait_count = self.ctx.rng.randint(base[0], base[1])
            experience_waits.append(
                {
                    "wait_id": self.ctx.next_id("experience_waits"),
                    "program_id": program["program_id"],
                    "wait_count": wait_count,
                    "wait_min": max(3, int(wait_count * self.ctx.rng.uniform(0.5, 0.9))),
                    "updated_at": self.ctx.now,
                }
            )

        # Store simple event wait stats for validator summary
        booth_wait_sum: dict[int, list[int]] = defaultdict(list)
        for row in booth_waits:
            event_id = booth_by_id[row["booth_id"]]["event_id"]
            booth_wait_sum[event_id].append(row["wait_count"])

        exp_wait_sum: dict[int, list[int]] = defaultdict(list)
        for row in experience_waits:
            event_id = program_by_id[row["program_id"]]["event_id"]
            exp_wait_sum[event_id].append(row["wait_count"])

        self.ctx.wait_stats_by_event = {
            eid: {
                "booth_avg": round(sum(values) / len(values), 2) if values else 0.0,
                "booth_max": max(values) if values else 0,
                "exp_avg": round(sum(exp_wait_sum.get(eid, [])) / max(1, len(exp_wait_sum.get(eid, []))), 2),
                "exp_max": max(exp_wait_sum.get(eid, [0])),
            }
            for eid, values in booth_wait_sum.items()
        }

        return booth_waits, experience_waits
