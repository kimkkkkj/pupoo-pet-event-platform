"""booths builder."""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any


BOOTH_TYPES = [
    "BOOTH_COMPANY",
    "BOOTH_EXPERIENCE",
    "BOOTH_SALE",
    "BOOTH_FOOD",
    "BOOTH_INFO",
    "BOOTH_SPONSOR",
    "SESSION_ROOM",
    "CONTEST_ZONE",
    "STAGE",
    "ETC",
]


class BoothBuilder:
    """Generate booths with in-event uniqueness and low global repetition."""

    def __init__(self, context: Any) -> None:
        self.ctx = context
        self.pool = context.pools
        self.name_counter: Counter[str] = Counter()
        self.recent_names: list[str] = []

    def build(self, events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        min_per_event = int(self.ctx.config["booths"]["min_per_event"])
        booth_names = self.pool.pools.get("booth_names_ko", [])
        companies = self.pool.pools.get("booth_companies_ko", [])
        if not booth_names:
            raise ValueError("booth_names_ko pool is empty")

        rows: list[dict[str, Any]] = []
        booths_by_event: dict[int, list[int]] = defaultdict(list)
        scale_extra = {"L": 22, "M": 10, "S": 0}

        for event in events:
            event_id = event["event_id"]
            event_scale = getattr(self.ctx, "event_scale_by_id", {}).get(event_id, "S")
            booth_count = min_per_event + scale_extra.get(event_scale, 0)
            used_names: set[str] = set()

            for _ in range(booth_count):
                place_name = self._pick_booth_name(booth_names, used_names)
                booth_type = self.ctx.rng.choices(
                    BOOTH_TYPES,
                    weights=[18, 16, 16, 10, 8, 6, 10, 6, 6, 4],
                    k=1,
                )[0]
                zone = self.ctx.rng.choices(
                    ["ZONE_A", "ZONE_B", "ZONE_C", "OTHER"],
                    weights=[36, 32, 24, 8],
                    k=1,
                )[0]
                company = None
                if booth_type in {"BOOTH_COMPANY", "BOOTH_SALE", "BOOTH_SPONSOR", "BOOTH_FOOD"} and companies:
                    company = companies[self.ctx.rng.randrange(len(companies))]

                booth_id = self.ctx.next_id("booths")
                rows.append(
                    {
                        "booth_id": booth_id,
                        "event_id": event_id,
                        "place_name": place_name,
                        "type": booth_type,
                        "description": f"{place_name}에서 제품 체험과 상담을 진행합니다.",
                        "company": company,
                        "zone": zone,
                        "status": "OPEN",
                        "created_at": self.ctx.now,
                    }
                )
                booths_by_event[event_id].append(booth_id)
                self.name_counter[place_name] += 1
                self.recent_names.append(place_name)
                if len(self.recent_names) > 120:
                    self.recent_names.pop(0)

        self.ctx.booths_by_event = booths_by_event
        return rows

    def _pick_booth_name(self, pool: list[str], used_names: set[str]) -> str:
        candidates = [name for name in pool if name not in used_names]
        if not candidates:
            candidates = pool[:]

        # Lower probability for recently used names and globally frequent names.
        scored = sorted(
            candidates,
            key=lambda x: (
                self.name_counter[x],
                1 if x in self.recent_names else 0,
                self.ctx.rng.random(),
            ),
        )
        shortlist = scored[: max(20, len(scored) // 5)]
        value = self.ctx.rng.choice(shortlist)
        used_names.add(value)
        return value
