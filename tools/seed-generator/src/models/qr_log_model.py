"""qr_logs table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class QrLogModel(SeedModel):
    qr_log_id: Optional[int] = None
    qr_id: int = 0
    event_id: int = 0
    user_id: int = 0
    log_type: str = "CHECKIN"
    logged_at: datetime = field(default_factory=now_ts)
    created_at: datetime = field(default_factory=now_ts)

