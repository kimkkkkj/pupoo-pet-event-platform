"""Relative URL builder utilities."""

from __future__ import annotations


def _ensure_kind(kind: str) -> str:
    if kind not in {"main", "thumb"}:
        raise ValueError(f"kind must be 'main' or 'thumb': {kind}")
    return kind


def build_event_image_path(event_id: int, order: int, kind: str = "main") -> str:
    """Build event image relative path."""
    _ensure_kind(kind)
    if kind == "main":
        return f"/images/events/event_{event_id:02d}_{order:02d}_main.jpg"
    return f"/images/events/event_{event_id:02d}_{order:02d}_thumb.jpg"


def build_gallery_image_path(gallery_id: int, order: int, kind: str = "main") -> str:
    """Build gallery image relative path."""
    _ensure_kind(kind)
    if kind == "main":
        return f"/images/gallery/gallery_{gallery_id}_{order}.jpg"
    return f"/images/gallery/gallery_{gallery_id}_{order}_thumb.jpg"


def build_qr_path(event_id: int, user_id: int) -> str:
    """Build QR image relative path."""
    return f"/qr/event/{event_id}/user/{user_id}.png"

