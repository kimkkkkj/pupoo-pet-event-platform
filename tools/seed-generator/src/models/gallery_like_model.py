"""gallery_likes table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class GalleryLikeModel(SeedModel):
    like_id: Optional[int] = None
    gallery_id: int = 0
    user_id: int = 0
    created_at: datetime = field(default_factory=now_ts)

