"""payments table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class PaymentModel(SeedModel):
    payment_id: Optional[int] = None
    event_id: Optional[int] = None
    event_apply_id: Optional[int] = None
    user_id: int = 0
    order_no: str = ""
    amount: float = 0.0
    status: str = "PAID"
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

