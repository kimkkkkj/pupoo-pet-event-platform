"""notification_settings table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class NotificationSettingModel(SeedModel):
    setting_id: Optional[int] = None
    user_id: int = 0
    allow_marketing: bool = True
    allow_event: bool = True
    allow_system: bool = True
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

