"""qr_codes table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class QrCodeModel(SeedModel):
    qr_id: Optional[int] = None
    event_id: int = 0
    user_id: int = 0
    qr_path: str = ""
    issued_at: datetime = field(default_factory=now_ts)
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

