"""speakers table model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from src.models.base import SeedModel, now_ts


@dataclass
class SpeakerModel(SeedModel):
    speaker_id: Optional[int] = None
    speaker_name: str = ""
    organization: Optional[str] = None
    position: Optional[str] = None
    created_at: datetime = field(default_factory=now_ts)
    updated_at: datetime = field(default_factory=now_ts)

