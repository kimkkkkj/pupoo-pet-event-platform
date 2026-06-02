# PUPOO Policy Core

이 폴더는 깃에 유지할 핵심 정책 문서만 모아둔 압축 문서 세트다.
중복 번들, 레거시 묶음, 일회성 합본 문서는 제외하고 현재 구조 판단과 실행 우선순위에 필요한 문서만 남긴다.

## 읽는 순서

1. `governance/MASTER_POLICY.md`
2. `governance/SOURCE_OF_TRUTH_MAP.md`
3. `governance/KNOWN_MISMATCHES.md`
4. `governance/MISMATCH_PRIORITY_MATRIX.md`
5. 필요한 주제별 폴더 문서

## 폴더 설명

- `governance`
  - 전체 정책 기준, SSOT, 현재 mismatch, 실행 backlog를 다룬다.
- `inventory`
  - 워크스페이스 구조와 백엔드 기능 인벤토리를 다룬다.
- `api-alignment`
  - API 상태, 유지/삭제 판단, 호환 레이어 제거 계획을 다룬다.
- `auth-runtime`
  - 인증 구조 목표와 배포 런타임 검증 결과를 다룬다.
- `cleanup`
  - 정리 규칙과 워크스페이스 정리 계획을 다룬다.

## 포함 기준

- 현재도 의사결정 기준으로 쓰이는 문서
- 구조 변경 전에 먼저 읽어야 하는 문서
- 중복 문서를 대표할 수 있는 상위 문서

## 제외 기준

- 번들 문서
- 올인원 합본 문서
- 레거시 패키지 문서
- 코멘트 품질 같은 보조 리포트
- 동일 내용을 반복 설명하는 세부 보고서
