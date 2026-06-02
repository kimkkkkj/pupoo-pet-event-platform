"""event_congestion_policy table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class EventCongestionPolicyModel(SeedModel):
    policy_id: Optional[int] = None
    event_id: int = 0
    target_type: str = "EVENT"
    threshold_low: float = 20.0
    threshold_medium: float = 50.0
    threshold_high: float = 80.0
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

