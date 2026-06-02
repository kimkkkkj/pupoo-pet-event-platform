"""event table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class EventModel(SeedModel):
    event_id: Optional[int] = None
    event_name: str = ""
    description: str = ""
    location: str = ""
    status: str = "PLANNED"
    start_at: datetime = field(default_factory=now_ts)
    end_at: datetime = field(default_factory=now_ts)
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

