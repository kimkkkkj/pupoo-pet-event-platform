"""program_speakers table model."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from src.models.base import SeedModel


@dataclass
class ProgramSpeakerModel(SeedModel):
    id: Optional[int] = None
    program_id: int = 0
    speaker_id: int = 0

