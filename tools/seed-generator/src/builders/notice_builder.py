"""notices builder."""

from __future__ import annotations

from datetime import timedelta
from typing import Any


NOTICE_BODY = [
    "행사장 내 반려동물 안전을 위해 리드줄 착용을 부탁드립니다.",
    "프로그램 시작 10분 전까지 입장 부탁드립니다.",
    "혼잡 시간대에는 운영 요원 안내에 따라 이동해 주세요.",
    "분실물 접수는 종합안내데스크에서 가능합니다.",
]


class NoticeBuilder:
    """Generate admin notices."""

    def __init__(self, context: Any) -> None:
        self.ctx = context
        self.pool = context.pools

    def build(self, users: list[dict[str, Any]], events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        admin_ids = [u["user_id"] for u in users if u["role_name"] == "ADMIN"]
        if not admin_ids:
            return []
        title_pool = self.pool.pools.get("notice_titles_ko", [])

        rows: list[dict[str, Any]] = []
        global_count = 8
        event_count = 18

        for idx in range(global_count):
            created_at = self.ctx.now - timedelta(days=self.ctx.rng.randint(0, 120))
            title = title_pool[idx % len(title_pool)] if title_pool else f"운영 공지 {idx + 1}"
            rows.append(
                {
                    "notice_id": self.ctx.next_id("notices"),
                    "scope": "GLOBAL",
                    "event_id": None,
                    "notice_title": title,
                    "content": " ".join(self.ctx.rng.sample(NOTICE_BODY, k=2)),
                    "file_attached": "N",
                    "is_pinned": self.ctx.rng.choice([0, 1]),
                    "status": "PUBLISHED",
                    "created_by_admin_id": self.ctx.rng.choice(admin_ids),
                    "view_count": self.ctx.rng.randint(100, 3000),
                    "created_at": created_at,
                    "updated_at": created_at + timedelta(days=self.ctx.rng.randint(0, 3)),
                }
            )

        for idx in range(event_count):
            event = self.ctx.rng.choice(events)
            created_at = event["start_at"] - timedelta(days=self.ctx.rng.randint(1, 14))
            title = title_pool[(idx + 17) % len(title_pool)] if title_pool else f"{event['event_name']} 운영 안내"
            rows.append(
                {
                    "notice_id": self.ctx.next_id("notices"),
                    "scope": "EVENT",
                    "event_id": event["event_id"],
                    "notice_title": title,
                    "content": " ".join(self.ctx.rng.sample(NOTICE_BODY, k=2)),
                    "file_attached": "N",
                    "is_pinned": self.ctx.rng.choice([0, 0, 1]),
                    "status": "PUBLISHED",
                    "created_by_admin_id": self.ctx.rng.choice(admin_ids),
                    "view_count": self.ctx.rng.randint(40, 1400),
                    "created_at": created_at,
                    "updated_at": created_at + timedelta(days=self.ctx.rng.randint(0, 2)),
                }
            )

        return rows
