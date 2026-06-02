"""booth_waits table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class BoothWaitModel(SeedModel):
    wait_id: Optional[int] = None
    booth_id: int = 0
    wait_count: int = 0
    wait_min: int = 0
    updated_at: datetime = field(default_factory=now_ts)

