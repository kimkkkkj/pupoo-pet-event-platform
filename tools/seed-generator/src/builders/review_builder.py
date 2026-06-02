"""reviews/review_comments builder."""

from __future__ import annotations

from datetime import timedelta
from typing import Any


REVIEW_SENTENCES = [
    "행사 동선이 잘 짜여 있어서 이동이 편했습니다.",
    "행동 교정 세션이 특히 유익했습니다.",
    "부스 구성이 다양해서 반려생활 정보를 많이 얻었습니다.",
    "현장 안내가 친절해 처음 방문해도 어렵지 않았습니다.",
    "체험 프로그램 진행이 깔끔해서 만족도가 높았습니다.",
    "다음 시즌에도 재방문 의사가 있습니다.",
]


class ReviewBuilder:
    """Generate reviews focused on ended events."""

    def __init__(self, context: Any) -> None:
        self.ctx = context
        self.pool = context.pools

    def build(
        self,
        users: list[dict[str, Any]],
        events: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        user_ids = [u["user_id"] for u in users if u["role_name"] == "USER"]
        ended_events = [e for e in events if e["status"] == "ENDED"]
        title_pool = self.pool.pools.get("review_titles_ko", [])
        reviews: list[dict[str, Any]] = []
        comments: list[dict[str, Any]] = []

        if not user_ids or not ended_events:
            return reviews, comments

        for event in ended_events:
            event_id = event["event_id"]
            scale = getattr(self.ctx, "event_scale_by_id", {}).get(event_id, "S")
            target = {"L": 520, "M": 320, "S": 180}[scale]
            target = min(target, len(user_ids))
            selected_users = self.ctx.rng.sample(user_ids, target)

            for idx, user_id in enumerate(selected_users):
                created_at = event["end_at"] - timedelta(days=self.ctx.rng.randint(0, 20))
                review_id = self.ctx.next_id("reviews")
                title = title_pool[(event_id + idx) % len(title_pool)] if title_pool else f"{event['event_name']} 후기"
                reviews.append(
                    {
                        "review_id": review_id,
                        "event_id": event_id,
                        "user_id": user_id,
                        "review_title": title,
                        "content": self._make_body(),
                        "rating": self.ctx.rng.choices([3, 4, 5], weights=[14, 36, 50], k=1)[0],
                        "view_count": self.ctx.rng.randint(0, 1200),
                        "created_at": created_at,
                        "updated_at": created_at + timedelta(days=self.ctx.rng.randint(0, 5)),
                        "is_deleted": 0,
                        "is_comment_enabled": self.ctx.rng.choice([0, 1, 1]),
                        "review_status": "PUBLIC",
                    }
                )

                if self.ctx.rng.random() < 0.34:
                    for _ in range(self.ctx.rng.randint(1, 3)):
                        comments.append(
                            {
                                "comment_id": self.ctx.next_id("review_comments"),
                                "review_id": review_id,
                                "user_id": self.ctx.rng.choice(user_ids),
                                "content": self._make_body(min_sentence=1, max_sentence=2),
                                "created_at": created_at + timedelta(hours=self.ctx.rng.randint(1, 72)),
                                "updated_at": created_at + timedelta(hours=self.ctx.rng.randint(1, 120)),
                                "is_deleted": 0,
                            }
                        )

        return reviews, comments

    def _make_body(self, min_sentence: int = 2, max_sentence: int = 4) -> str:
        count = self.ctx.rng.randint(min_sentence, max_sentence)
        picks = self.ctx.rng.sample(REVIEW_SENTENCES, k=count)
        return " ".join(picks)
