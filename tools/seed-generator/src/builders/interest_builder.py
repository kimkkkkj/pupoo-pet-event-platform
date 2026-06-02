"""interests builder."""

from __future__ import annotations

from typing import Any


INTEREST_ENUMS = [
    "EVENT",
    "SESSION",
    "EXPERIENCE",
    "BOOTH",
    "CONTEST",
    "NOTICE",
    "SNACK",
    "BATH_SUPPLIES",
    "GROOMING",
    "TOY",
    "CLOTHING",
    "HEALTH",
    "TRAINING",
    "WALK",
    "SUPPLEMENTS",
    "ACCESSORIES",
    "OTHERS",
]


class InterestBuilder:
    """Generate interest master rows from enum values."""

    def __init__(self, context: Any) -> None:
        self.ctx = context

    def build(self) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for name in INTEREST_ENUMS:
            rows.append(
                {
                    "interest_id": self.ctx.next_id("interests"),
                    "interest_name": name,
                    "type": "SYSTEM",
                    "is_active": 1,
                    "created_at": self.ctx.now,
                }
            )
        return rows
