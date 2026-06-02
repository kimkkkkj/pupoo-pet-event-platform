"""boards builder."""

from __future__ import annotations

from typing import Any


class BoardBuilder:
    """Generate fixed board rows."""

    def __init__(self, context: Any) -> None:
        self.ctx = context

    def build(self) -> list[dict[str, Any]]:
        board_defs = [
            ("자유게시판", "FREE"),
            ("정보게시판", "INFO"),
            ("후기게시판", "REVIEW"),
            ("질문게시판", "QNA"),
            ("자주 묻는 질문", "FAQ"),
        ]
        rows: list[dict[str, Any]] = []
        for board_name, board_type in board_defs:
            rows.append(
                {
                    "board_id": self.ctx.next_id("boards"),
                    "board_name": board_name,
                    "board_type": board_type,
                    "is_active": 1,
                    "created_at": self.ctx.now,
                }
            )
        return rows
