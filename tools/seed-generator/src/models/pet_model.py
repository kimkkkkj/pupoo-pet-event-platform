"""pet table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class PetModel(SeedModel):
    pet_id: Optional[int] = None
    user_id: int = 0
    pet_name: str = ""
    pet_type: str = "DOG"
    breed: Optional[str] = None
    birth_date: Optional[datetime] = None
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

