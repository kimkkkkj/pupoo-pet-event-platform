"""event builder."""

from __future__ import annotations

from datetime import datetime
from typing import Any


FIXED_ONGOING_PERIODS = [
    ("2026-03-10 09:00:00", "2026-03-20 18:00:00"),
    ("2026-03-13 09:00:00", "2026-03-23 18:00:00"),
    ("2026-03-10 09:00:00", "2026-03-30 18:00:00"),
    ("2026-03-12 09:00:00", "2026-04-01 18:00:00"),
    ("2026-03-12 09:00:00", "2026-03-25 18:00:00"),
]


def _to_dt(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")


class EventBuilder:
    """Generate 15 events with deterministic status/date distribution."""

    def __init__(self, context: Any) -> None:
        self.ctx = context
        self.pool = context.pools

    def build(self) -> list[dict[str, Any]]:
        event_defs = [
            ("서울 반려가족 박람회", "서울 COEX Hall C", "L"),
            ("부산 펫 라이프 페어", "부산 BEXCO 제1전시장", "L"),
            ("고양 반려동물 문화축제", "고양 KINTEX 제2전시장", "L"),
            ("대구 반려생활 엑스포", "대구 EXCO 서관", "M"),
            ("광주 반려케어 포럼", "광주 김대중컨벤션센터", "M"),
            ("인천 펫 웰니스 데이", "인천 송도컨벤시아", "M"),
            ("수원 반려가족 페스타", "수원컨벤션센터", "M"),
            ("대전 펫 트래블 쇼", "대전컨벤션센터", "M"),
            ("창원 반려라이프 박람회", "창원컨벤션센터", "M"),
            ("제주 펫 아일랜드 쇼", "제주국제컨벤션센터", "S"),
            ("울산 반려생활 마켓", "울산전시컨벤션센터", "S"),
            ("전주 반려동물 문화마당", "전주 화산체육관", "S"),
            ("강릉 펫 플레이 그라운드", "강릉 아이스아레나 이벤트홀", "S"),
            ("청주 펫 힐링 페어", "청주 오스코", "S"),
            ("포항 반려가족 위크", "포항 만인당", "S"),
        ]

        periods = self._build_status_periods()
        statuses = ["ENDED"] * 5 + ["ONGOING"] * 7 + ["PLANNED"] * 3

        rows: list[dict[str, Any]] = []
        scale_by_id: dict[int, str] = {}

        for idx, (name, location, size) in enumerate(event_defs):
            event_id = self.ctx.next_id("event")
            status = statuses[idx]
            start_at, end_at = periods[idx]

            rows.append(
                {
                    "event_id": event_id,
                    "event_name": name,
                    "description": f"{name}는 반려동물 보호자와 반려인이 함께 즐기는 체험형 행사입니다.",
                    "start_at": start_at,
                    "end_at": end_at,
                    "location": location,
                    "status": status,
                    "round_no": 1,
                    "image_url": f"/images/events/event_{event_id:02d}_cover.jpg",
                    "base_fee": float(self.ctx.rng.choice([0, 3000, 5000, 7000])),
                    "organizer": "Pupoo 운영팀",
                    "organizer_phone": "02-1234-5678",
                    "organizer_email": "event@pupoo.kr",
                }
            )
            scale_by_id[event_id] = size

        self.ctx.event_scale_by_id = scale_by_id
        return rows

    def _build_status_periods(self) -> list[tuple[datetime, datetime]]:
        ended = [
            (_to_dt("2026-01-08 09:00:00"), _to_dt("2026-01-12 18:00:00")),
            (_to_dt("2026-01-20 09:00:00"), _to_dt("2026-01-24 18:00:00")),
            (_to_dt("2026-02-01 09:00:00"), _to_dt("2026-02-06 18:00:00")),
            (_to_dt("2026-02-10 09:00:00"), _to_dt("2026-02-16 18:00:00")),
            (_to_dt("2026-02-21 09:00:00"), _to_dt("2026-03-02 18:00:00")),
        ]
        ongoing = [(_to_dt(s), _to_dt(e)) for s, e in FIXED_ONGOING_PERIODS]
        ongoing.extend(
            [
                (_to_dt("2026-03-08 09:00:00"), _to_dt("2026-03-18 18:00:00")),
                (_to_dt("2026-03-13 09:00:00"), _to_dt("2026-03-28 18:00:00")),
            ]
        )
        planned = [
            (_to_dt("2026-03-24 09:00:00"), _to_dt("2026-03-29 18:00:00")),
            (_to_dt("2026-04-02 09:00:00"), _to_dt("2026-04-08 18:00:00")),
            (_to_dt("2026-04-15 09:00:00"), _to_dt("2026-04-20 18:00:00")),
        ]
        return ended + ongoing + planned
