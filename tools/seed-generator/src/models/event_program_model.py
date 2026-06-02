"""event_program table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class EventProgramModel(SeedModel):
    program_id: Optional[int] = None
    event_id: int = 0
    booth_id: Optional[int] = None
    category: str = "SESSION"
    program_title: str = ""
    description: str = ""
    image_url: Optional[str] = None
    start_at: datetime = field(default_factory=now_ts)
    end_at: datetime = field(default_factory=now_ts)
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

