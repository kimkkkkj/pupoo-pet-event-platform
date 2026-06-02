"""galleries/gallery_images/gallery_likes builder."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from src.utils.url_builder import build_gallery_image_path


class GalleryBuilder:
    """Generate gallery content with thumbnail FK-safe sequence."""

    def __init__(self, context: Any) -> None:
        self.ctx = context

    def build(
        self,
        users: list[dict[str, Any]],
        events: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
        user_ids = [u["user_id"] for u in users if u["role_name"] == "USER"]
        target_events = [e for e in events if e["status"] in {"ONGOING", "ENDED"}]
        if not user_ids or not target_events:
            return [], [], []

        galleries: list[dict[str, Any]] = []
        images: list[dict[str, Any]] = []
        likes: list[dict[str, Any]] = []
        used_like_pairs: set[tuple[int, int]] = set()

        for event in target_events:
            scale = getattr(self.ctx, "event_scale_by_id", {}).get(event["event_id"], "S")
            count = {"L": 140, "M": 90, "S": 55}[scale]
            selected_users = self.ctx.rng.sample(user_ids, min(count, len(user_ids)))

            for idx, user_id in enumerate(selected_users):
                gallery_id = self.ctx.next_id("galleries")
                created_at = event["start_at"] + timedelta(days=self.ctx.rng.randint(0, 6))
                galleries.append(
                    {
                        "gallery_id": gallery_id,
                        "event_id": event["event_id"],
                        "user_id": user_id,
                        "gallery_title": f"{event['event_name']} 현장 기록 {idx + 1}",
                        "gallery_description": "행사 현장 분위기와 반려동물 체험 모습을 담았습니다.",
                        "view_count": self.ctx.rng.randint(10, 1800),
                        "thumbnail_image_id": None,
                        "gallery_status": "PUBLIC",
                        "created_at": created_at,
                        "updated_at": created_at + timedelta(days=self.ctx.rng.randint(0, 5)),
                    }
                )

                image_count = self.ctx.rng.randint(1, 4)
                first_image_id = None
                for order in range(1, image_count + 1):
                    image_id = self.ctx.next_id("gallery_images")
                    if first_image_id is None:
                        first_image_id = image_id
                    images.append(
                        {
                            "image_id": image_id,
                            "gallery_id": gallery_id,
                            "original_url": build_gallery_image_path(gallery_id, order, "main"),
                            "thumb_url": build_gallery_image_path(gallery_id, order, "thumb"),
                            "image_order": order,
                            "mime_type": "jpg",
                            "file_size": 220000 + order * 5000,
                            "created_at": created_at,
                        }
                    )

                galleries[-1]["thumbnail_image_id"] = first_image_id

                like_count = self.ctx.rng.randint(0, 45 if scale == "L" else 28 if scale == "M" else 16)
                like_users = self.ctx.rng.sample(user_ids, min(like_count, len(user_ids)))
                for like_user in like_users:
                    pair = (gallery_id, like_user)
                    if pair in used_like_pairs:
                        continue
                    used_like_pairs.add(pair)
                    likes.append(
                        {
                            "like_id": self.ctx.next_id("gallery_likes"),
                            "gallery_id": gallery_id,
                            "user_id": like_user,
                            "created_at": created_at + timedelta(minutes=self.ctx.rng.randint(1, 3000)),
                        }
                    )

        return galleries, images, likes
