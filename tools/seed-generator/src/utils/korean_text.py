"""Korean particle utilities."""

from __future__ import annotations

import re

_HANGUL_BASE = 0xAC00
_HANGUL_LAST = 0xD7A3


def has_final_consonant(text: str) -> bool:
    """Return True when the last Korean syllable has final consonant."""
    if not text or not text.strip():
        return False
    last = text.strip()[-1]
    code = ord(last)
    if code < _HANGUL_BASE or code > _HANGUL_LAST:
        return False
    return ((code - _HANGUL_BASE) % 28) != 0


def choose_topic_particle(text: str) -> str:
    """Choose '은/는'."""
    return "은" if has_final_consonant(text) else "는"


def choose_subject_particle(text: str) -> str:
    """Choose '이/가'."""
    return "이" if has_final_consonant(text) else "가"


def choose_object_particle(text: str) -> str:
    """Choose '을/를'."""
    return "을" if has_final_consonant(text) else "를"


def choose_with_particle(text: str) -> str:
    """Choose '과/와'."""
    return "과" if has_final_consonant(text) else "와"


def choose_direction_particle(text: str) -> str:
    """Choose '으로/로' with ㄹ 예외 처리."""
    if not text or not text.strip():
        return "로"
    last = text.strip()[-1]
    if last == "ㄹ":
        return "로"
    return "으로" if has_final_consonant(text) else "로"


def has_broken_particle_pattern(text: str) -> bool:
    """Simple sanity check for obvious broken particle sequences."""
    if not text:
        return False
    return bool(re.search(r"(는는|은는|이가|을를|과와|으로로)", text))
