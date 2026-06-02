"""Pre-insert in-memory seed validator."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Any, Iterable

from src.utils.korean_text import has_broken_particle_pattern


FIXED_ONGOING_PERIODS = {
    ("2026-03-10 09:00:00", "2026-03-20 18:00:00"),
    ("2026-03-13 09:00:00", "2026-03-23 18:00:00"),
    ("2026-03-10 09:00:00", "2026-03-30 18:00:00"),
    ("2026-03-12 09:00:00", "2026-04-01 18:00:00"),
    ("2026-03-12 09:00:00", "2026-03-25 18:00:00"),
}


class SeedValidator:
    """Validate uniqueness, FK, and sanity checks before SQL export."""

    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config
        self.base_now = datetime(2026, 3, 14, 0, 0, 0)

    def validate(self, data: dict[str, list[Any]]) -> list[str]:
        users = self._rows(data, "users")
        pets = self._rows(data, "pet")
        events = self._rows(data, "event")
        event_images = self._rows(data, "event_images")
        booths = self._rows(data, "booths")
        programs = self._rows(data, "event_program")
        event_applies = self._rows(data, "event_apply")
        program_applies = self._rows(data, "event_program_apply")
        qr_codes = self._rows(data, "qr_codes")
        booth_waits = self._rows(data, "booth_waits")
        experience_waits = self._rows(data, "experience_waits")
        reviews = self._rows(data, "reviews")
        gallery_likes = self._rows(data, "gallery_likes")
        subscriptions = self._rows(data, "user_interest_subscriptions")
        event_interest_map = self._rows(data, "event_interest_map")
        galleries = self._rows(data, "galleries")
        gallery_images = self._rows(data, "gallery_images")
        payments = self._rows(data, "payments")
        refunds = self._rows(data, "refunds")

        self._assert_unique(users, "email", "users.email UNIQUE 위반")
        self._assert_unique(users, "phone", "users.phone UNIQUE 위반")
        self._assert_unique(users, "nickname", "users.nickname UNIQUE 위반")
        self._assert_pet_name_per_user(pets)

        self._assert_event_distribution(events)
        self._assert_fixed_ongoing_periods(events)
        self._assert_event_status_date_consistency(events)

        self._assert_pair_unique(event_images, "event_id", "image_order", "event_images(event_id,image_order) UNIQUE 위반")
        self._assert_group_unique(booths, "event_id", "place_name", "booths same-event place_name UNIQUE 위반")
        self._assert_group_unique(programs, "event_id", "program_title", "event_program same-event program_title UNIQUE 위반")
        self._assert_program_daily_minimum(programs, events)
        self._assert_pair_unique(qr_codes, "user_id", "event_id", "qr_codes(user_id,event_id) UNIQUE 위반")
        self._assert_unique(booth_waits, "booth_id", "booth_waits booth_id UNIQUE 위반")
        self._assert_unique(experience_waits, "program_id", "experience_waits program_id UNIQUE 위반")
        self._assert_pair_unique(reviews, "event_id", "user_id", "reviews(event_id,user_id) UNIQUE 위반")
        self._assert_pair_unique(gallery_likes, "gallery_id", "user_id", "gallery_likes(gallery_id,user_id) UNIQUE 위반")
        self._assert_pair_unique(subscriptions, "user_id", "interest_id", "user_interest_subscriptions(user_id,interest_id) UNIQUE 위반")
        self._assert_pair_unique(event_interest_map, "event_id", "interest_id", "event_interest_map(event_id,interest_id) UNIQUE 위반")

        self._assert_event_apply_active_unique(event_applies)
        self._assert_program_apply_active_unique(program_applies)
        self._assert_cancelled_at_rule(program_applies)

        self._assert_relative_url_fields(data)
        self._assert_fk_integrity(data)
        self._assert_gallery_thumbnail_fk(galleries, gallery_images)
        self._assert_payment_refund_checks(payments, refunds)
        self._assert_nickname_sanity(users)
        self._assert_particle_sanity(data)

        summary = [
            "validation passed",
            "duplicate checks passed",
            "fk reference checks passed",
            "check constraint sanity checks passed",
        ]
        summary.extend(self._build_stats(data))
        return summary

    @staticmethod
    def _rows(data: dict[str, list[Any]], table: str) -> list[dict[str, Any]]:
        rows = data.get(table, [])
        normalized: list[dict[str, Any]] = []
        for row in rows:
            if hasattr(row, "as_dict"):
                normalized.append(row.as_dict())
            elif isinstance(row, dict):
                normalized.append(row)
            else:
                raise TypeError(f"{table} row type not supported: {type(row)!r}")
        return normalized

    @staticmethod
    def _assert_unique(rows: list[dict[str, Any]], key: str, message: str) -> None:
        seen: set[Any] = set()
        for row in rows:
            value = row.get(key)
            if value in seen:
                raise ValueError(f"{message}: {value}")
            seen.add(value)

    @staticmethod
    def _assert_pair_unique(rows: list[dict[str, Any]], k1: str, k2: str, message: str) -> None:
        seen: set[tuple[Any, Any]] = set()
        for row in rows:
            pair = (row.get(k1), row.get(k2))
            if pair in seen:
                raise ValueError(f"{message}: {pair}")
            seen.add(pair)

    @staticmethod
    def _assert_group_unique(rows: list[dict[str, Any]], group_key: str, value_key: str, message: str) -> None:
        grouped: dict[Any, set[Any]] = defaultdict(set)
        for row in rows:
            group = row.get(group_key)
            value = row.get(value_key)
            if value in grouped[group]:
                raise ValueError(f"{message}: ({group_key}={group}, {value_key}={value})")
            grouped[group].add(value)

    def _assert_event_distribution(self, events: list[dict[str, Any]]) -> None:
        if len(events) != 15:
            raise ValueError(f"event 수가 15가 아닙니다: {len(events)}")
        counter = Counter(e["status"] for e in events)
        expected = {"ENDED": 5, "ONGOING": 7, "PLANNED": 3}
        if dict(counter) != expected:
            raise ValueError(f"event 상태 분포 불일치 actual={dict(counter)} expected={expected}")

    @staticmethod
    def _dt_str(value: Any) -> str:
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return str(value)

    def _assert_fixed_ongoing_periods(self, events: list[dict[str, Any]]) -> None:
        actual = {
            (self._dt_str(e["start_at"]), self._dt_str(e["end_at"]))
            for e in events
            if e.get("status") == "ONGOING"
        }
        if not FIXED_ONGOING_PERIODS.issubset(actual):
            missing = FIXED_ONGOING_PERIODS - actual
            raise ValueError(f"ONGOING 고정 일정 누락: {missing}")

    def _assert_event_status_date_consistency(self, events: list[dict[str, Any]]) -> None:
        now = self.base_now
        for event in events:
            start = self._as_datetime(event["start_at"])
            end = self._as_datetime(event["end_at"])
            status = event["status"]
            if status == "ONGOING" and not (start <= now <= end):
                raise ValueError(f"ONGOING 날짜 불일치 event_id={event.get('event_id')}")
            if status == "PLANNED" and not (start > now):
                raise ValueError(f"PLANNED 날짜 불일치 event_id={event.get('event_id')}")
            if status == "ENDED" and not (end < now):
                raise ValueError(f"ENDED 날짜 불일치 event_id={event.get('event_id')}")

    def _assert_program_daily_minimum(self, programs: list[dict[str, Any]], events: list[dict[str, Any]]) -> None:
        req_session = int(self.config.get("programs", {}).get("session_min_per_day", 2))
        req_contest = int(self.config.get("programs", {}).get("contest_min_per_day", 2))
        req_experience = int(self.config.get("programs", {}).get("experience_min_per_day", 6))

        by_event_day: dict[tuple[int, Any], Counter[str]] = defaultdict(Counter)
        for program in programs:
            event_id = int(program["event_id"])
            start_date = self._as_datetime(program["start_at"]).date()
            by_event_day[(event_id, start_date)][str(program["category"])] += 1

        for event in events:
            event_id = int(event["event_id"])
            day = self._as_datetime(event["start_at"]).date()
            end_day = self._as_datetime(event["end_at"]).date()
            while day <= end_day:
                day_counter = by_event_day.get((event_id, day), Counter())
                session_count = day_counter.get("SESSION", 0)
                contest_count = day_counter.get("CONTEST", 0)
                experience_count = day_counter.get("EXPERIENCE", 0)
                if (
                    session_count < req_session
                    or contest_count < req_contest
                    or experience_count < req_experience
                ):
                    raise ValueError(
                        "event_program daily minimum 위반: "
                        f"event_id={event_id}, date={day}, "
                        f"SESSION={session_count}(<{req_session}), "
                        f"CONTEST={contest_count}(<{req_contest}), "
                        f"EXPERIENCE={experience_count}(<{req_experience})"
                    )
                day += timedelta(days=1)

    @staticmethod
    def _as_datetime(value: Any) -> datetime:
        if isinstance(value, datetime):
            return value
        return datetime.fromisoformat(str(value).replace(" ", "T"))

    @staticmethod
    def _assert_pet_name_per_user(pets: list[dict[str, Any]]) -> None:
        by_user: dict[int, set[str]] = defaultdict(set)
        for pet in pets:
            uid = pet["user_id"]
            name = pet["pet_name"]
            if name in by_user[uid]:
                raise ValueError(f"같은 user 내 pet_name 중복: user_id={uid}, name={name}")
            by_user[uid].add(name)

    @staticmethod
    def _assert_event_apply_active_unique(applies: list[dict[str, Any]]) -> None:
        seen: set[tuple[Any, Any]] = set()
        for row in applies:
            if row.get("status") not in {"APPLIED", "APPROVED"}:
                continue
            pair = (row.get("user_id"), row.get("event_id"))
            if pair in seen:
                raise ValueError(f"event_apply 활성 중복: {pair}")
            seen.add(pair)

    @staticmethod
    def _assert_program_apply_active_unique(applies: list[dict[str, Any]]) -> None:
        seen: set[tuple[Any, Any]] = set()
        for row in applies:
            if row.get("status") not in {"APPLIED", "WAITING", "APPROVED"}:
                continue
            pair = (row.get("user_id"), row.get("program_id"))
            if pair in seen:
                raise ValueError(f"event_program_apply 활성 중복: {pair}")
            seen.add(pair)

    @staticmethod
    def _assert_cancelled_at_rule(applies: list[dict[str, Any]]) -> None:
        for row in applies:
            status = row.get("status")
            cancelled_at = row.get("cancelled_at")
            if status == "CANCELLED" and cancelled_at is None:
                raise ValueError(f"event_program_apply cancelled_at 누락: {row.get('program_apply_id')}")
            if status != "CANCELLED" and cancelled_at is not None:
                raise ValueError(f"event_program_apply cancelled_at 불일치: {row.get('program_apply_id')}")

    @staticmethod
    def _assert_relative_url_fields(data: dict[str, list[Any]]) -> None:
        url_like_fields = {"original_url", "thumb_url", "image_url", "qr_path", "speaker_image_url"}
        for table, rows in data.items():
            for row in rows:
                row_dict = row.as_dict() if hasattr(row, "as_dict") else row
                for key, value in row_dict.items():
                    if key not in url_like_fields or value is None:
                        continue
                    text = str(value).lower()
                    if text.startswith("http://") or text.startswith("https://"):
                        raise ValueError(f"절대 URL 금지 위반: table={table}, {key}={value}")

    def _assert_fk_integrity(self, data: dict[str, list[Any]]) -> None:
        users = {r["user_id"] for r in self._rows(data, "users")}
        pets = {r["pet_id"] for r in self._rows(data, "pet")}
        events = {r["event_id"] for r in self._rows(data, "event")}
        booths = {r["booth_id"] for r in self._rows(data, "booths")}
        programs = {r["program_id"] for r in self._rows(data, "event_program")}
        interests = {r["interest_id"] for r in self._rows(data, "interests")}
        boards = {r["board_id"] for r in self._rows(data, "boards")}
        posts = {r["post_id"] for r in self._rows(data, "posts")}
        reviews = {r["review_id"] for r in self._rows(data, "reviews")}
        galleries = {r["gallery_id"] for r in self._rows(data, "galleries")}
        qr_codes = {r["qr_id"] for r in self._rows(data, "qr_codes")}
        notifications = {r["notification_id"] for r in self._rows(data, "notification")}
        payments = {r["payment_id"] for r in self._rows(data, "payments")}
        event_applies = {r["apply_id"] for r in self._rows(data, "event_apply")}

        self._assert_fk(self._rows(data, "pet"), "user_id", users, "pet.user_id FK 위반")
        self._assert_fk(self._rows(data, "event_images"), "event_id", events, "event_images.event_id FK 위반")
        self._assert_fk(self._rows(data, "booths"), "event_id", events, "booths.event_id FK 위반")
        self._assert_fk(self._rows(data, "event_program"), "event_id", events, "event_program.event_id FK 위반")
        self._assert_fk_nullable(self._rows(data, "event_program"), "booth_id", booths, "event_program.booth_id FK 위반")
        self._assert_fk(self._rows(data, "event_apply"), "user_id", users, "event_apply.user_id FK 위반")
        self._assert_fk(self._rows(data, "event_apply"), "event_id", events, "event_apply.event_id FK 위반")
        self._assert_fk(self._rows(data, "event_program_apply"), "program_id", programs, "event_program_apply.program_id FK 위반")
        self._assert_fk_nullable(self._rows(data, "event_program_apply"), "user_id", users, "event_program_apply.user_id FK 위반")
        self._assert_fk_nullable(self._rows(data, "event_program_apply"), "pet_id", pets, "event_program_apply.pet_id FK 위반")
        self._assert_fk(self._rows(data, "booth_waits"), "booth_id", booths, "booth_waits.booth_id FK 위반")
        self._assert_fk(self._rows(data, "experience_waits"), "program_id", programs, "experience_waits.program_id FK 위반")
        self._assert_fk(self._rows(data, "congestions"), "program_id", programs, "congestions.program_id FK 위반")
        self._assert_fk(self._rows(data, "posts"), "board_id", boards, "posts.board_id FK 위반")
        self._assert_fk(self._rows(data, "posts"), "user_id", users, "posts.user_id FK 위반")
        self._assert_fk(self._rows(data, "post_comments"), "post_id", posts, "post_comments.post_id FK 위반")
        self._assert_fk(self._rows(data, "post_comments"), "user_id", users, "post_comments.user_id FK 위반")
        self._assert_fk(self._rows(data, "reviews"), "event_id", events, "reviews.event_id FK 위반")
        self._assert_fk(self._rows(data, "reviews"), "user_id", users, "reviews.user_id FK 위반")
        self._assert_fk(self._rows(data, "review_comments"), "review_id", reviews, "review_comments.review_id FK 위반")
        self._assert_fk(self._rows(data, "review_comments"), "user_id", users, "review_comments.user_id FK 위반")
        self._assert_fk(self._rows(data, "galleries"), "event_id", events, "galleries.event_id FK 위반")
        self._assert_fk(self._rows(data, "galleries"), "user_id", users, "galleries.user_id FK 위반")
        self._assert_fk(self._rows(data, "gallery_images"), "gallery_id", galleries, "gallery_images.gallery_id FK 위반")
        self._assert_fk(self._rows(data, "gallery_likes"), "gallery_id", galleries, "gallery_likes.gallery_id FK 위반")
        self._assert_fk(self._rows(data, "gallery_likes"), "user_id", users, "gallery_likes.user_id FK 위반")
        self._assert_fk(self._rows(data, "payments"), "user_id", users, "payments.user_id FK 위반")
        self._assert_fk_nullable(self._rows(data, "payments"), "event_id", events, "payments.event_id FK 위반")
        self._assert_fk(self._rows(data, "payments"), "event_apply_id", event_applies, "payments.event_apply_id FK 위반")
        self._assert_fk(self._rows(data, "refunds"), "payment_id", payments, "refunds.payment_id FK 위반")
        self._assert_fk(self._rows(data, "qr_codes"), "user_id", users, "qr_codes.user_id FK 위반")
        self._assert_fk(self._rows(data, "qr_codes"), "event_id", events, "qr_codes.event_id FK 위반")
        self._assert_fk(self._rows(data, "qr_logs"), "qr_id", qr_codes, "qr_logs.qr_id FK 위반")
        self._assert_fk(self._rows(data, "qr_logs"), "booth_id", booths, "qr_logs.booth_id FK 위반")
        self._assert_fk(self._rows(data, "notices"), "created_by_admin_id", users, "notices.created_by_admin_id FK 위반")
        self._assert_fk_nullable(self._rows(data, "notices"), "event_id", events, "notices.event_id FK 위반")
        self._assert_fk(self._rows(data, "notification_send"), "notification_id", notifications, "notification_send.notification_id FK 위반")
        self._assert_fk(self._rows(data, "notification_send"), "sender_id", users, "notification_send.sender_id FK 위반")
        self._assert_fk(self._rows(data, "notification_inbox"), "notification_id", notifications, "notification_inbox.notification_id FK 위반")
        self._assert_fk(self._rows(data, "notification_inbox"), "user_id", users, "notification_inbox.user_id FK 위반")
        self._assert_fk(self._rows(data, "notification_settings"), "user_id", users, "notification_settings.user_id FK 위반")
        self._assert_fk(self._rows(data, "user_interest_subscriptions"), "user_id", users, "subscription.user_id FK 위반")
        self._assert_fk(self._rows(data, "user_interest_subscriptions"), "interest_id", interests, "subscription.interest_id FK 위반")
        self._assert_fk(self._rows(data, "event_interest_map"), "event_id", events, "event_interest_map.event_id FK 위반")
        self._assert_fk(self._rows(data, "event_interest_map"), "interest_id", interests, "event_interest_map.interest_id FK 위반")

    @staticmethod
    def _assert_fk(rows: list[dict[str, Any]], key: str, target_ids: set[Any], message: str) -> None:
        for row in rows:
            value = row.get(key)
            if value not in target_ids:
                raise ValueError(f"{message}: {value}")

    @staticmethod
    def _assert_fk_nullable(rows: list[dict[str, Any]], key: str, target_ids: set[Any], message: str) -> None:
        for row in rows:
            value = row.get(key)
            if value is None:
                continue
            if value not in target_ids:
                raise ValueError(f"{message}: {value}")

    @staticmethod
    def _assert_gallery_thumbnail_fk(galleries: list[dict[str, Any]], images: list[dict[str, Any]]) -> None:
        image_ids = {row["image_id"] for row in images}
        for gallery in galleries:
            thumbnail_id = gallery.get("thumbnail_image_id")
            if thumbnail_id is not None and thumbnail_id not in image_ids:
                raise ValueError(
                    f"galleries.thumbnail_image_id FK 위반: gallery_id={gallery.get('gallery_id')}, thumbnail={thumbnail_id}"
                )

    @staticmethod
    def _assert_payment_refund_checks(payments: list[dict[str, Any]], refunds: list[dict[str, Any]]) -> None:
        for payment in payments:
            if float(payment.get("amount", 0)) <= 0:
                raise ValueError(f"payments.amount > 0 위반: payment_id={payment.get('payment_id')}")
        for refund in refunds:
            amount = float(refund.get("refund_amount", 0))
            if amount <= 0:
                raise ValueError(f"refunds.refund_amount > 0 위반: refund_id={refund.get('refund_id')}")
            status = refund.get("status")
            completed_at = refund.get("completed_at")
            if status == "COMPLETED" and completed_at is None:
                raise ValueError(f"refund completed_at NULL 위반: refund_id={refund.get('refund_id')}")
            if status != "COMPLETED" and completed_at is not None:
                raise ValueError(f"refund completed_at 불일치: refund_id={refund.get('refund_id')}")

    @staticmethod
    def _assert_nickname_sanity(users: list[dict[str, Any]]) -> None:
        for user in users:
            nickname = str(user.get("nickname", ""))
            if len(nickname) > 16:
                raise ValueError(f"nickname 길이 초과: {nickname}")
            if nickname.lower().startswith("user00"):
                raise ValueError(f"nickname 패턴 이상: {nickname}")

    def _assert_particle_sanity(self, data: dict[str, list[Any]]) -> None:
        scan_tables = ("event", "booths", "posts", "reviews", "notices")
        for table in scan_tables:
            for row in self._rows(data, table):
                for key in ("description", "content", "gallery_description"):
                    text = row.get(key)
                    if text and has_broken_particle_pattern(str(text)):
                        raise ValueError(f"조사 패턴 이상: table={table}, key={key}, text={text}")

    def _build_stats(self, data: dict[str, list[Any]]) -> list[str]:
        lines: list[str] = []
        users = self._rows(data, "users")
        pets = self._rows(data, "pet")
        booths = self._rows(data, "booths")
        programs = self._rows(data, "event_program")
        events = self._rows(data, "event")

        lines.append(self._counter_line("nickname length", [len(str(u["nickname"])) for u in users]))
        lines.extend(self._top_line("pet_name", [p.get("pet_name", "") for p in pets], limit=20))
        lines.extend(self._top_line("booth place_name", [b.get("place_name", "") for b in booths], limit=20))
        lines.extend(self._top_line("program_title", [p.get("program_title", "") for p in programs], limit=20))

        event_applies = self._rows(data, "event_apply")
        qr_codes = self._rows(data, "qr_codes")
        qr_logs = self._rows(data, "qr_logs")
        payments = self._rows(data, "payments")
        program_applies = self._rows(data, "event_program_apply")
        reviews = self._rows(data, "reviews")
        galleries = self._rows(data, "galleries")

        by_event_apply = Counter(row["event_id"] for row in event_applies)
        by_event_qr = Counter(row["event_id"] for row in qr_codes)
        by_event_qr_log = Counter()
        qr_to_event = {q["qr_id"]: q["event_id"] for q in qr_codes}
        for row in qr_logs:
            event_id = qr_to_event.get(row["qr_id"])
            if event_id is not None:
                by_event_qr_log[event_id] += 1
        by_event_payment = Counter(row["event_id"] for row in payments if row.get("event_id") is not None)
        programs_by_id = {p["program_id"]: p for p in programs}
        by_event_program_apply = Counter(
            programs_by_id[row["program_id"]]["event_id"] for row in program_applies if row["program_id"] in programs_by_id
        )
        by_event_review = Counter(row["event_id"] for row in reviews)
        by_event_gallery = Counter(row["event_id"] for row in galleries)

        lines.append("event별 row count 요약:")
        for event in sorted(events, key=lambda x: x["event_id"]):
            eid = event["event_id"]
            lines.append(
                f"  event={eid} status={event['status']} apply={by_event_apply[eid]} "
                f"qr={by_event_qr[eid]} qr_log={by_event_qr_log[eid]} payment={by_event_payment[eid]} "
                f"program_apply={by_event_program_apply[eid]} review={by_event_review[eid]} gallery={by_event_gallery[eid]}"
            )
        return lines

    @staticmethod
    def _counter_line(label: str, values: Iterable[int]) -> str:
        counter = Counter(values)
        return f"{label}: {dict(counter)}"

    @staticmethod
    def _top_line(label: str, values: Iterable[str], limit: int = 20) -> list[str]:
        counter = Counter(v for v in values if v)
        top = counter.most_common(limit)
        lines = [f"{label} top{limit}:"]
        for name, cnt in top:
            lines.append(f"  {name}: {cnt}")
        if top:
            lines.append(f"  top1 share hint: {top[0][1]}/{sum(counter.values())}")
        return lines
