"""notification_inbox table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class NotificationInboxModel(SeedModel):
    inbox_id: Optional[int] = None
    notification_id: int = 0
    user_id: int = 0
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=now_ts)

