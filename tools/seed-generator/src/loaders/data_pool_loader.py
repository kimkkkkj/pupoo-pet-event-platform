"""Text data-pool loader for seed generation."""

from __future__ import annotations

import random
from pathlib import Path


POOL_FILES = {
    "surnames_ko": "surnames_ko.txt",
    "given_names_ko": "given_names_ko.txt",
    "nickname_pool": "nickname_pool.txt",
    "pet_names_ko": "pet_names_ko.txt",
    "event_names_ko": "event_names_ko.txt",
    "venue_names_ko": "venue_names_ko.txt",
    "booth_names_ko": "booth_names_ko.txt",
    "booth_companies_ko": "booth_companies_ko.txt",
    "session_titles_ko": "session_titles_ko.txt",
    "contest_titles_ko": "contest_titles_ko.txt",
    "experience_titles_ko": "experience_titles_ko.txt",
    "speaker_names_ko": "speaker_names_ko.txt",
    "post_titles_ko": "post_titles_ko.txt",
    "review_titles_ko": "review_titles_ko.txt",
    "notice_titles_ko": "notice_titles_ko.txt",
    "notification_titles_ko": "notification_titles_ko.txt",
    "notification_contents_ko": "notification_contents_ko.txt",
    "payment_refund_reasons_ko": "payment_refund_reasons_ko.txt",
}


def load_lines(path: str | Path) -> list[str]:
    """Load UTF-8 text lines with empty-line and duplicate removal."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"data_pool 파일이 없습니다: {p}")
    with p.open("r", encoding="utf-8") as fp:
        raw = [line.strip() for line in fp.readlines()]
    seen: set[str] = set()
    cleaned: list[str] = []
    for line in raw:
        if not line:
            continue
        if line in seen:
            continue
        seen.add(line)
        cleaned.append(line)
    return cleaned


class DataPoolLoader:
    """Named text pool loader with random pick helpers."""

    def __init__(self, seed: int = 20260314) -> None:
        self.pools: dict[str, list[str]] = {}
        self.random = random.Random(seed)

    def load_named_pool(self, base_dir: str | Path) -> dict[str, list[str]]:
        """Load all named pools from base_dir."""
        base = Path(base_dir)
        if not base.exists():
            raise FileNotFoundError(f"data_pool 디렉터리가 없습니다: {base}")

        for pool_name, filename in POOL_FILES.items():
            path = base / filename
            self.pools[pool_name] = load_lines(path)
        return self.pools

    def get_random_value(self, pool_name: str) -> str:
        """Pick random value from a named pool."""
        if pool_name not in self.pools:
            raise KeyError(f"pool이 없습니다: {pool_name}")
        values = self.pools[pool_name]
        if not values:
            raise ValueError(f"pool이 비어 있습니다: {pool_name}")
        return self.random.choice(values)

    def get_unique_value(self, pool_name: str, used_set: set[str]) -> str:
        """Pick value not present in used_set, with fallback retry."""
        if pool_name not in self.pools:
            raise KeyError(f"pool이 없습니다: {pool_name}")

        values = self.pools[pool_name]
        candidates = [v for v in values if v not in used_set]
        if candidates:
            value = self.random.choice(candidates)
            used_set.add(value)
            return value

        value = self.random.choice(values)
        used_set.add(value)
        return value


_default_loader = DataPoolLoader()


def load_named_pool(base_dir: str | Path) -> dict[str, list[str]]:
    """Module-level helper for loading all pools."""
    return _default_loader.load_named_pool(base_dir)


def get_random_value(pool_name: str) -> str:
    """Module-level helper for random pick."""
    return _default_loader.get_random_value(pool_name)


def get_unique_value(pool_name: str, used_set: set[str]) -> str:
    """Module-level helper for unique pick."""
    return _default_loader.get_unique_value(pool_name, used_set)

