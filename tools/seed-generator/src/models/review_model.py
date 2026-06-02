"""reviews table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class ReviewModel(SeedModel):
    review_id: Optional[int] = None
    event_id: int = 0
    user_id: int = 0
    title: str = ""
    content: str = ""
    rating: int = 5
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

