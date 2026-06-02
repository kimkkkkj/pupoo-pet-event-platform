"""event_program_apply table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class EventProgramApplyModel(SeedModel):
    program_apply_id: Optional[int] = None
    program_id: int = 0
    user_id: int = 0
    pet_id: Optional[int] = None
    status: str = "APPLIED"
    active_flag: Optional[int] = 1
    cancelled_at: Optional[datetime] = None
    checked_in_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

