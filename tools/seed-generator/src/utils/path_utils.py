"""Path helper utilities."""

from __future__ import annotations

from pathlib import Path


def resolve_path(base_dir: Path, value: str) -> Path:
    """Resolve an absolute/relative path from base_dir."""
    raw = Path(value)
    if raw.is_absolute():
        return raw
    return (base_dir / raw).resolve()


def ensure_parent_dir(path: Path) -> None:
    """Create parent directory if needed."""
    path.parent.mkdir(parents=True, exist_ok=True)

