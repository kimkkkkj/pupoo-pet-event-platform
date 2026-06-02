"""user_interest_subscriptions table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class UserInterestSubscriptionModel(SeedModel):
    id: Optional[int] = None
    user_id: int = 0
    interest_id: int = 0
    created_at: datetime = field(default_factory=now_ts)

