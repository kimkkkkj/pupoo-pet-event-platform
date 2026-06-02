"""notices table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class NoticeModel(SeedModel):
    notice_id: Optional[int] = None
    created_by_admin_id: int = 0
    title: str = ""
    content: str = ""
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

