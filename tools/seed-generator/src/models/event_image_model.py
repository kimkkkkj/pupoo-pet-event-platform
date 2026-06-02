"""event_images table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class EventImageModel(SeedModel):
    image_id: Optional[int] = None
    event_id: int = 0
    image_url: str = ""
    image_order: int = 1
    image_type: str = "MAIN"
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

