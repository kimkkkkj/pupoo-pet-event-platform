"""포스터 하루 생성 횟수 제한.

유료 이미지 모델 비용이 새지 않도록, 한국 시간 기준 하루에 만들 수 있는 장수를 막는다.
서버를 다시 켜도 초기화되지 않게 작은 JSON 파일에 날짜와 횟수를 적어 둔다.
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

_KST = timezone(timedelta(hours=9))


class PosterDailyLimitError(Exception):
    def __init__(self, limit: int) -> None:
        super().__init__(f"오늘 만들 수 있는 AI 포스터 {limit}장을 모두 썼어요. 내일 다시 시도해 주세요.")
        self.message = str(self)
        self.limit = limit


class PosterDailyQuota:
    def __init__(self, *, limit: int, path: Path) -> None:
        self._limit = limit
        self._path = path
        self._lock = threading.Lock()

    @property
    def enabled(self) -> bool:
        return self._limit > 0

    def _today(self) -> str:
        return datetime.now(_KST).strftime("%Y-%m-%d")

    def _read_count(self) -> int:
        try:
            data = json.loads(self._path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return 0
        return int(data.get("count", 0)) if data.get("date") == self._today() else 0

    def _write_count(self, count: int) -> None:
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            self._path.write_text(json.dumps({"date": self._today(), "count": count}), encoding="utf-8")
        except OSError as exc:
            logger.warning("poster quota file write failed: %s", exc)

    def acquire(self) -> None:
        """한 장을 예약한다. 오늘 한도를 다 썼으면 PosterDailyLimitError."""
        if not self.enabled:
            return
        with self._lock:
            count = self._read_count()
            if count >= self._limit:
                raise PosterDailyLimitError(self._limit)
            self._write_count(count + 1)
            logger.info("poster quota used %d/%d", count + 1, self._limit)

    def release(self) -> None:
        """생성에 실패하면 예약한 한 장을 돌려준다."""
        if not self.enabled:
            return
        with self._lock:
            self._write_count(max(0, self._read_count() - 1))
