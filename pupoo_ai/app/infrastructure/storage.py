"""스토리지 경계 인터페이스.

기능:
- AI 레이어가 파일 저장 구현에 직접 의존하지 않도록 추상화를 제공한다.

설명:
- 현재는 포트 정의만 있고 구체 구현체는 없다.
- 공개 URL 조합은 이 레이어 밖에서 처리한다.
"""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class StorageReference:
    # 기능: 저장 결과를 식별하는 최소 정보 묶음이다.
    key: str
    internal_path: str | None = None


class StorageAdapter(Protocol):
    # 기능: 생성 파일 저장 포트를 정의한다.
    # 설명: AI 로직은 저장 위치의 세부 구현 대신 이 인터페이스만 의존한다.
    def store_generated_file(
        self,
        *,
        content: bytes,
        content_type: str,
        key_hint: str | None = None,
    ) -> StorageReference:
        ...


# 기능: 향후 생성 파일 저장 구현은 이 모듈의 구체 어댑터로 연결한다.
# 설명: AI 레이어는 storage key 또는 내부 참조만 반환하고, 공개 경로 해석은 외부 경계에서 처리한다.
