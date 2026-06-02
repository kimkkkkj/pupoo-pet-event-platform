"""galleries table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class GalleryModel(SeedModel):
    gallery_id: Optional[int] = None
    event_id: int = 0
    user_id: int = 0
    title: str = ""
    content: str = ""
    thumbnail_image_id: Optional[int] = None
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

