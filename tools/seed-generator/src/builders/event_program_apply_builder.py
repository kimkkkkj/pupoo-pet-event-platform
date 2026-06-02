"""event_program_apply builder."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import timedelta
from typing import Any


class EventProgramApplyBuilder:
    """Generate program applications with category-specific behavior."""

    def __init__(self, context: Any) -> None:
        self.ctx = context

    def build(
        self,
        event_applies: list[dict[str, Any]],
        programs: list[dict[str, Any]],
        pets: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        active_users_by_event: dict[int, list[int]] = defaultdict(list)
        for apply_row in event_applies:
            if apply_row["status"] in {"APPLIED", "APPROVED"}:
                active_users_by_event[apply_row["event_id"]].append(apply_row["user_id"])

        pets_by_user: dict[int, list[int]] = defaultdict(list)
        for pet in pets:
            pets_by_user[pet["user_id"]].append(pet["pet_id"])

        rows: list[dict[str, Any]] = []
        category_counter: Counter[str] = Counter()
        status_counter: Counter[str] = Counter()

        for program in programs:
            event_id = program["event_id"]
            users = active_users_by_event.get(event_id, [])
            if not users:
                continue

            scale = getattr(self.ctx, "event_scale_by_id", {}).get(event_id, "S")
            target = self._target_for_program(program, scale, len(users))
            selected = self.ctx.rng.sample(users, target)

            for user_id in selected:
                status = self._pick_status(program["category"])
                cancelled_at = None
                checked_in_at = None
                if status == "CANCELLED":
                    cancelled_at = program["start_at"] - timedelta(hours=self.ctx.rng.randint(1, 48))
                elif status == "CHECKED_IN":
                    checked_in_at = program["start_at"] + timedelta(minutes=self.ctx.rng.randint(0, 20))

                row = {
                    "program_apply_id": self.ctx.next_id("event_program_apply"),
                    "program_id": program["program_id"],
                    "user_id": user_id,
                    "pet_id": self.ctx.rng.choice(pets_by_user[user_id]) if pets_by_user[user_id] else None,
                    "image_url": None,
                    "admin_pet_name": None,
                    "status": status,
                    "ticket_no": f"T{program['program_id']:05d}{user_id:05d}"[:30],
                    "eta_min": self.ctx.rng.randint(5, 40) if status == "WAITING" else None,
                    "notified_at": program["start_at"] - timedelta(minutes=10) if status in {"WAITING", "APPROVED"} else None,
                    "checked_in_at": checked_in_at,
                    "created_at": program["start_at"] - timedelta(days=self.ctx.rng.randint(0, 20)),
                    "cancelled_at": cancelled_at,
                }
                rows.append(row)
                category_counter[program["category"]] += 1
                status_counter[status] += 1

        self.ctx.program_apply_stats = {
            "category": dict(category_counter),
            "status": dict(status_counter),
        }
        return rows

    def _target_for_program(self, program: dict[str, Any], scale: str, user_count: int) -> int:
        capacity = int(program.get("capacity") or 30)
        if scale == "L":
            factor = {"SESSION": 0.95, "CONTEST": 0.9, "EXPERIENCE": 1.05}[program["category"]]
        elif scale == "M":
            factor = {"SESSION": 0.8, "CONTEST": 0.75, "EXPERIENCE": 0.9}[program["category"]]
        else:
            factor = {"SESSION": 0.65, "CONTEST": 0.6, "EXPERIENCE": 0.7}[program["category"]]
        target = max(8, int(capacity * factor))
        return min(user_count, target)

    def _pick_status(self, category: str) -> str:
        if category == "EXPERIENCE":
            return self.ctx.rng.choices(
                ["WAITING", "APPROVED", "CHECKED_IN", "APPLIED", "CANCELLED", "REJECTED"],
                weights=[42, 22, 16, 14, 4, 2],
                k=1,
            )[0]
        if category == "SESSION":
            return self.ctx.rng.choices(
                ["APPROVED", "CHECKED_IN", "APPLIED", "WAITING", "CANCELLED", "REJECTED"],
                weights=[45, 28, 16, 5, 4, 2],
                k=1,
            )[0]
        return self.ctx.rng.choices(
            ["APPROVED", "CHECKED_IN", "WAITING", "APPLIED", "CANCELLED", "REJECTED"],
            weights=[40, 30, 12, 10, 5, 3],
            k=1,
        )[0]
