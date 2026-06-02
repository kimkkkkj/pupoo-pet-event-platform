"""booths table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class BoothModel(SeedModel):
    booth_id: Optional[int] = None
    event_id: int = 0
    place_name: str = ""
    zone: str = "A"
    type: str = "GENERAL"
    status: str = "OPEN"
    company: Optional[str] = None
    description: str = ""
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

