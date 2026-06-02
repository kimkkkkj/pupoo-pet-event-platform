"""posts table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class PostModel(SeedModel):
    post_id: Optional[int] = None
    board_id: int = 0
    user_id: int = 0
    event_id: Optional[int] = None
    title: str = ""
    content: str = ""
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

