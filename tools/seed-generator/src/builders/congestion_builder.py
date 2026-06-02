"""congestions builder."""

from __future__ import annotations

from collections import Counter
from datetime import timedelta
from typing import Any


class CongestionBuilder:
    """Generate per-program congestion snapshots."""

    def __init__(self, context: Any) -> None:
        self.ctx = context

    def build(
        self,
        events: list[dict[str, Any]],
        booths: list[dict[str, Any]],
        programs: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        booth_by_id = {b["booth_id"]: b for b in booths}
        rows: list[dict[str, Any]] = []
        level_counter: Counter[int] = Counter()

        for program in programs:
            event_scale = getattr(self.ctx, "event_scale_by_id", {}).get(program["event_id"], "S")
            if event_scale == "L":
                level = self.ctx.rng.choices([2, 3, 4, 5], weights=[10, 28, 38, 24], k=1)[0]
            elif event_scale == "M":
                level = self.ctx.rng.choices([1, 2, 3, 4, 5], weights=[10, 24, 32, 24, 10], k=1)[0]
            else:
                level = self.ctx.rng.choices([1, 2, 3, 4], weights=[24, 38, 28, 10], k=1)[0]

            booth = booth_by_id.get(program.get("booth_id"))
            zone = booth["zone"] if booth else "OTHER"
            place_name = booth["place_name"] if booth else program["program_title"]
            measured_at = program["start_at"] + timedelta(minutes=self.ctx.rng.randint(0, 45))

            rows.append(
                {
                    "congestion_id": self.ctx.next_id("congestions"),
                    "program_id": program["program_id"],
                    "zone": zone,
                    "place_name": place_name,
                    "congestion_level": level,
                    "measured_at": measured_at,
                }
            )
            level_counter[level] += 1

        self.ctx.congestion_level_counter = dict(level_counter)
        return rows
