"""refunds table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class RefundModel(SeedModel):
    refund_id: Optional[int] = None
    payment_id: int = 0
    amount: float = 0.0
    reason: str = ""
    status: str = "REQUESTED"
    requested_at: datetime = field(default_factory=now_ts)
    completed_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

