"""subscription builders."""

from __future__ import annotations

from typing import Any


class SubscriptionBuilder:
    """Generate user-interest subscriptions and event-interest map."""

    def __init__(self, context: Any) -> None:
        self.ctx = context

    def build(
        self,
        users: list[dict[str, Any]],
        interests: list[dict[str, Any]],
        events: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        user_ids = [u["user_id"] for u in users if u["role_name"] == "USER"]
        interest_ids = [i["interest_id"] for i in interests]
        if not user_ids or not interest_ids:
            return [], []

        subscriptions: list[dict[str, Any]] = []
        for user_id in user_ids:
            sample_size = self.ctx.rng.randint(2, min(6, len(interest_ids)))
            selected = self.ctx.rng.sample(interest_ids, sample_size)
            for interest_id in selected:
                subscriptions.append(
                    {
                        "subscription_id": self.ctx.next_id("user_interest_subscriptions"),
                        "user_id": user_id,
                        "interest_id": interest_id,
                        "allow_inapp": 1,
                        "allow_email": self.ctx.rng.choice([0, 1, 1]),
                        "allow_sms": self.ctx.rng.choice([0, 1]),
                        "status": self.ctx.rng.choices(
                            ["ACTIVE", "PAUSED", "CANCELLED"],
                            weights=[84, 12, 4],
                            k=1,
                        )[0],
                        "created_at": self.ctx.now,
                    }
                )

        event_interest_map: list[dict[str, Any]] = []
        for event in events:
            selected = self.ctx.rng.sample(interest_ids, self.ctx.rng.randint(3, min(6, len(interest_ids))))
            for interest_id in selected:
                event_interest_map.append(
                    {
                        "event_interest_map_id": self.ctx.next_id("event_interest_map"),
                        "event_id": event["event_id"],
                        "interest_id": interest_id,
                        "created_at": self.ctx.now,
                    }
                )

        return subscriptions, event_interest_map
