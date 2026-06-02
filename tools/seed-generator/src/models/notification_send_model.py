"""notification_send table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class NotificationSendModel(SeedModel):
    send_id: Optional[int] = None
    notification_id: int = 0
    sent_at: datetime = field(default_factory=now_ts)

