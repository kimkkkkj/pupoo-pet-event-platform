"""notification builders."""

from __future__ import annotations

from datetime import timedelta
from typing import Any


class NotificationBuilder:
    """Generate notification / send / inbox / settings rows."""

    def __init__(self, context: Any) -> None:
        self.ctx = context
        self.pool = context.pools

    def build(
        self,
        users: list[dict[str, Any]],
        events: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
        user_ids = [u["user_id"] for u in users]
        admin_ids = [u["user_id"] for u in users if u["role_name"] == "ADMIN"]
        if not user_ids:
            return [], [], [], []

        title_pool = self.pool.pools.get("notification_titles_ko", ["행사 알림"])
        content_pool = self.pool.pools.get("notification_contents_ko", ["행사 일정과 공지를 확인해 주세요."])

        notifications: list[dict[str, Any]] = []
        sends: list[dict[str, Any]] = []
        inbox: list[dict[str, Any]] = []
        settings: list[dict[str, Any]] = []

        for user_id in user_ids:
            settings.append(
                {
                    "user_id": user_id,
                    "allow_marketing": self.ctx.rng.choice([0, 1, 1]),
                    "updated_at": self.ctx.now - timedelta(days=self.ctx.rng.randint(0, 60)),
                }
            )

        notification_count = max(40, len(events) * 8)
        for idx in range(notification_count):
            event = self.ctx.rng.choice(events)
            created_at = self.ctx.now - timedelta(days=self.ctx.rng.randint(0, 30))
            notification_id = self.ctx.next_id("notification")
            notifications.append(
                {
                    "notification_id": notification_id,
                    "type": self.ctx.rng.choice(["EVENT", "NOTICE", "PAYMENT", "APPLY", "SYSTEM"]),
                    "notification_title": title_pool[idx % len(title_pool)],
                    "content": content_pool[idx % len(content_pool)],
                    "created_at": created_at,
                }
            )

            sends.append(
                {
                    "send_id": self.ctx.next_id("notification_send"),
                    "notification_id": notification_id,
                    "sender_id": self.ctx.rng.choice(admin_ids or user_ids),
                    "sender_type": "ADMIN" if admin_ids else "SYSTEM",
                    "channel": self.ctx.rng.choice(["APP", "EMAIL", "SMS", "PUSH"]),
                    "sent_at": created_at + timedelta(minutes=self.ctx.rng.randint(0, 120)),
                }
            )

            target_count = self.ctx.rng.randint(30, 240)
            targets = self.ctx.rng.sample(user_ids, min(target_count, len(user_ids)))
            for target_user in targets:
                inbox.append(
                    {
                        "inbox_id": self.ctx.next_id("notification_inbox"),
                        "user_id": target_user,
                        "notification_id": notification_id,
                        "created_at": created_at + timedelta(minutes=self.ctx.rng.randint(0, 180)),
                        "target_type": self.ctx.rng.choice(["EVENT", "NOTICE", None]),
                        "target_id": event["event_id"] if self.ctx.rng.random() < 0.7 else None,
                    }
                )

        return notifications, sends, inbox, settings
