"""event_interest_map table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class EventInterestMapModel(SeedModel):
    id: Optional[int] = None
    event_id: int = 0
    interest_id: int = 0
    created_at: datetime = field(default_factory=now_ts)

