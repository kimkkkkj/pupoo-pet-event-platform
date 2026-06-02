"""Operational seed generation orchestration."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from src.builders.board_builder import BoardBuilder
from src.builders.booth_builder import BoothBuilder
from src.builders.congestion_builder import CongestionBuilder
from src.builders.event_apply_builder import EventApplyBuilder
from src.builders.event_builder import EventBuilder
from src.builders.event_image_builder import EventImageBuilder
from src.builders.event_program_apply_builder import EventProgramApplyBuilder
from src.builders.event_program_builder import EventProgramBuilder
from src.builders.gallery_builder import GalleryBuilder
from src.builders.interest_builder import InterestBuilder
from src.builders.notice_builder import NoticeBuilder
from src.builders.notification_builder import NotificationBuilder
from src.builders.payment_builder import PaymentBuilder
from src.builders.pet_builder import PetBuilder
from src.builders.post_builder import PostBuilder
from src.builders.qr_builder import QrBuilder
from src.builders.review_builder import ReviewBuilder
from src.builders.subscription_builder import SubscriptionBuilder
from src.builders.user_builder import UserBuilder
from src.builders.wait_builder import WaitBuilder


@dataclass
class BuilderContext:
    """Shared context passed to each operational builder."""

    config: dict[str, Any]
    pools: Any
    mode: str
    rng: random.Random = field(default_factory=lambda: random.Random(20260314))
    now: datetime = field(default_factory=lambda: datetime(2026, 3, 14, 12, 0, 0))
    id_counters: dict[str, int] = field(default_factory=dict)

    def next_id(self, table: str) -> int:
        current = self.id_counters.get(table, 0) + 1
        self.id_counters[table] = current
        return current


@dataclass
class SeedBuildResult:
    """Operational seed build result object."""

    users: list[dict[str, Any]]
    pets: list[dict[str, Any]]
    boards: list[dict[str, Any]]
    interests: list[dict[str, Any]]
    events: list[dict[str, Any]]
    event_images: list[dict[str, Any]]
    booths: list[dict[str, Any]]
    event_programs: list[dict[str, Any]]
    speakers: list[dict[str, Any]]
    program_speakers: list[dict[str, Any]]
    event_congestion_policies: list[dict[str, Any]]
    event_interest_maps: list[dict[str, Any]]
    event_applies: list[dict[str, Any]]
    event_program_applies: list[dict[str, Any]]
    qr_codes: list[dict[str, Any]]
    qr_logs: list[dict[str, Any]]
    booth_waits: list[dict[str, Any]]
    experience_waits: list[dict[str, Any]]
    congestions: list[dict[str, Any]]
    posts: list[dict[str, Any]]
    post_comments: list[dict[str, Any]]
    notices: list[dict[str, Any]]
    reviews: list[dict[str, Any]]
    review_comments: list[dict[str, Any]]
    galleries: list[dict[str, Any]]
    gallery_images: list[dict[str, Any]]
    gallery_likes: list[dict[str, Any]]
    payments: list[dict[str, Any]]
    refunds: list[dict[str, Any]]
    notifications: list[dict[str, Any]]
    notification_sends: list[dict[str, Any]]
    notification_inboxes: list[dict[str, Any]]
    notification_settings: list[dict[str, Any]]
    user_interest_subscriptions: list[dict[str, Any]]
    social_accounts: list[dict[str, Any]]
    content_reports: list[dict[str, Any]]

    def as_table_dict(self) -> dict[str, list[dict[str, Any]]]:
        """Convert result object to SQL writer table map."""
        return {
            "users": self.users,
            "pet": self.pets,
            "boards": self.boards,
            "interests": self.interests,
            "event": self.events,
            "event_images": self.event_images,
            "booths": self.booths,
            "event_program": self.event_programs,
            "speakers": self.speakers,
            "program_speakers": self.program_speakers,
            "event_congestion_policy": self.event_congestion_policies,
            "event_interest_map": self.event_interest_maps,
            "event_apply": self.event_applies,
            "event_program_apply": self.event_program_applies,
            "qr_codes": self.qr_codes,
            "qr_logs": self.qr_logs,
            "booth_waits": self.booth_waits,
            "experience_waits": self.experience_waits,
            "congestions": self.congestions,
            "posts": self.posts,
            "post_comments": self.post_comments,
            "notices": self.notices,
            "reviews": self.reviews,
            "review_comments": self.review_comments,
            "galleries": self.galleries,
            "gallery_images": self.gallery_images,
            "gallery_likes": self.gallery_likes,
            "payments": self.payments,
            "refunds": self.refunds,
            "notification": self.notifications,
            "notification_send": self.notification_sends,
            "notification_inbox": self.notification_inboxes,
            "notification_settings": self.notification_settings,
            "user_interest_subscriptions": self.user_interest_subscriptions,
            "social_account": self.social_accounts,
            "content_reports": self.content_reports,
        }

    @property
    def event_map(self) -> dict[int, dict[str, Any]]:
        return {row["event_id"]: row for row in self.events}

    @property
    def program_map(self) -> dict[int, dict[str, Any]]:
        return {row["program_id"]: row for row in self.event_programs}


class OperationalSeedGenerator:
    """Operational seed generator."""

    def __init__(self, config: dict[str, Any], data_pool_loader: Any, mode: str = "operational") -> None:
        self.config = config
        self.context = BuilderContext(config=config, pools=data_pool_loader, mode=mode)

    def generate_result(self) -> SeedBuildResult:
        """Build operational seed data and return result object."""
        users = UserBuilder(self.context).build()
        pets = PetBuilder(self.context).build(users)
        boards = BoardBuilder(self.context).build()
        interests = InterestBuilder(self.context).build()
        events = EventBuilder(self.context).build()
        event_images = EventImageBuilder(self.context).build(events)
        booths = BoothBuilder(self.context).build(events)
        programs = EventProgramBuilder(self.context).build(events, booths)

        event_applies = EventApplyBuilder(self.context).build(users, events)
        program_applies = EventProgramApplyBuilder(self.context).build(event_applies, programs, pets)
        qr_codes, qr_logs = QrBuilder(self.context).build(event_applies, events, booths)
        booth_waits, experience_waits = WaitBuilder(self.context).build(booths, programs, events)
        congestions = CongestionBuilder(self.context).build(events, booths, programs)

        posts, post_comments = PostBuilder(self.context).build(users, boards, events)
        reviews, review_comments = ReviewBuilder(self.context).build(users, events)
        notices = NoticeBuilder(self.context).build(users, events)
        galleries, gallery_images, gallery_likes = GalleryBuilder(self.context).build(users, events)

        payments, refunds = PaymentBuilder(self.context).build(event_applies)
        notifications, notification_send, notification_inbox, notification_settings = NotificationBuilder(
            self.context
        ).build(users, events)
        user_interest_subscriptions, event_interest_map = SubscriptionBuilder(self.context).build(
            users, interests, events
        )

        return SeedBuildResult(
            users=users,
            pets=pets,
            boards=boards,
            interests=interests,
            events=events,
            event_images=event_images,
            booths=booths,
            event_programs=programs,
            speakers=[],
            program_speakers=[],
            event_congestion_policies=[],
            event_interest_maps=event_interest_map,
            event_applies=event_applies,
            event_program_applies=program_applies,
            qr_codes=qr_codes,
            qr_logs=qr_logs,
            booth_waits=booth_waits,
            experience_waits=experience_waits,
            congestions=congestions,
            posts=posts,
            post_comments=post_comments,
            notices=notices,
            reviews=reviews,
            review_comments=review_comments,
            galleries=galleries,
            gallery_images=gallery_images,
            gallery_likes=gallery_likes,
            payments=payments,
            refunds=refunds,
            notifications=notifications,
            notification_sends=notification_send,
            notification_inboxes=notification_inbox,
            notification_settings=notification_settings,
            user_interest_subscriptions=user_interest_subscriptions,
            social_accounts=[],
            content_reports=[],
        )

    # Backward-compatible output used by existing validators/writers.
    def generate(self) -> dict[str, list[dict[str, Any]]]:
        return self.generate_result().as_table_dict()


# Backward compatibility alias for older imports.
SeedGenerator = OperationalSeedGenerator
