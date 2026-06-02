"""Common dataclass base model for SQL serialization."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any


@dataclass
class SeedModel:
    """Base model with serializer support."""

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def now_ts() -> datetime:
    """Common timestamp factory."""
    return datetime.now()

