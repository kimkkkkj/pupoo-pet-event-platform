"""congestions table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class CongestionModel(SeedModel):
    congestion_id: Optional[int] = None
    event_id: int = 0
    target_type: str = "BOOTH"
    target_id: int = 0
    congestion_level: int = 1
    congestion_score: float = 0.0
    recorded_at: datetime = field(default_factory=now_ts)
    created_at: datetime = field(default_factory=now_ts)

