"""interests table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class InterestModel(SeedModel):
    interest_id: Optional[int] = None
    interest_type: str = "HEALTHCARE"
    interest_name: str = "건강"
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

