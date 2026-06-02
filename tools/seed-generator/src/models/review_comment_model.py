"""review_comments table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class ReviewCommentModel(SeedModel):
    comment_id: Optional[int] = None
    review_id: int = 0
    user_id: int = 0
    content: str = ""
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

