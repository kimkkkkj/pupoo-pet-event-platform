"""event_images builder."""

from __future__ import annotations

from typing import Any

from src.utils.url_builder import build_event_image_path


class EventImageBuilder:
    """Generate event_images rows per event."""

    def __init__(self, context: Any) -> None:
        self.ctx = context

    def build(self, events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for event in events:
            event_id = event["event_id"]
            for order in range(1, 4):
                rows.append(
                    {
                        "event_image_id": self.ctx.next_id("event_images"),
                        "event_id": event_id,
                        "original_url": build_event_image_path(event_id, order, "main"),
                        "thumb_url": build_event_image_path(event_id, order, "thumb"),
                        "image_order": order,
                        "mime_type": "jpg",
                        "file_size": 250000 + order * 1000,
                        "created_by_admin_id": 1,
                        "created_at": self.ctx.now,
                    }
                )
        return rows
