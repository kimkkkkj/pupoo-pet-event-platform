"""posts/post_comments builder."""

from __future__ import annotations

from datetime import timedelta
from typing import Any


POST_SENTENCES = [
    "오늘 오전에 다녀왔는데 동선이 생각보다 편했습니다.",
    "체험 부스는 대기가 있었지만 진행이 빨라서 괜찮았어요.",
    "초보 보호자에게 도움이 되는 정보가 많았습니다.",
    "주차 안내가 비교적 명확해서 이동이 수월했습니다.",
    "아이와 함께 방문했는데 프로그램 구성이 알찼습니다.",
    "반려견 휴식 공간이 넓어서 만족도가 높았습니다.",
    "현장 스태프 응대가 친절해서 인상이 좋았습니다.",
    "다음 행사도 일정 맞으면 다시 참여하고 싶습니다.",
]


class PostBuilder:
    """Generate community posts and comments."""

    def __init__(self, context: Any) -> None:
        self.ctx = context
        self.pool = context.pools

    def build(
        self,
        users: list[dict[str, Any]],
        boards: list[dict[str, Any]],
        events: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        user_ids = [u["user_id"] for u in users if u["role_name"] == "USER"]
        board_ids = [b["board_id"] for b in boards]
        event_ids = [e["event_id"] for e in events]
        title_pool = self.pool.pools.get("post_titles_ko", [])
        if not user_ids or not board_ids:
            return [], []

        post_count = max(320, len(user_ids) // 14)
        posts: list[dict[str, Any]] = []
        comments: list[dict[str, Any]] = []

        for idx in range(post_count):
            created_at = self.ctx.now - timedelta(days=self.ctx.rng.randint(0, 120))
            title = title_pool[idx % len(title_pool)] if title_pool else f"커뮤니티 소식 {idx + 1}"
            content = self._make_body()
            post_id = self.ctx.next_id("posts")
            posts.append(
                {
                    "post_id": post_id,
                    "board_id": self.ctx.rng.choice(board_ids),
                    "user_id": self.ctx.rng.choice(user_ids),
                    "post_title": title,
                    "content": content,
                    "answer_content": None,
                    "answered_at": None,
                    "file_attached": "N",
                    "status": "PUBLISHED",
                    "view_count": self.ctx.rng.randint(0, 800),
                    "created_at": created_at,
                    "updated_at": created_at + timedelta(days=self.ctx.rng.randint(0, 10)),
                    "is_deleted": 0,
                    "is_comment_enabled": 1,
                }
            )

            if self.ctx.rng.random() < 0.55:
                comment_size = self.ctx.rng.randint(1, 4)
                for _ in range(comment_size):
                    comments.append(
                        {
                            "comment_id": self.ctx.next_id("post_comments"),
                            "post_id": post_id,
                            "user_id": self.ctx.rng.choice(user_ids),
                            "content": self._make_body(min_sentence=1, max_sentence=2),
                            "created_at": created_at + timedelta(minutes=self.ctx.rng.randint(5, 600)),
                            "updated_at": created_at + timedelta(minutes=self.ctx.rng.randint(5, 900)),
                            "is_deleted": 0,
                        }
                    )

        return posts, comments

    def _make_body(self, min_sentence: int = 2, max_sentence: int = 4) -> str:
        count = self.ctx.rng.randint(min_sentence, max_sentence)
        picks = self.ctx.rng.sample(POST_SENTENCES, k=count)
        return " ".join(picks)
