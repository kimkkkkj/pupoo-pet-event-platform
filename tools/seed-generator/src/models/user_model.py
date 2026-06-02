"""users table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class UserModel(SeedModel):
    user_id: Optional[int] = None
    email: str = ""
    phone: str = ""
    nickname: str = ""
    role: str = "USER"
    status: str = "ACTIVE"
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

