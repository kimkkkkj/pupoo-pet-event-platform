# CLEANUP RULES

## 1. 삭제 기준

- 실제 import, route, API 호출, backend 연결, DB 영향이 모두 없을 때만 삭제 후보로 본다.
- 생성물, 캐시, 임시 산출물, 중복 alias route, 미사용 guard, 미사용 constants는 우선 삭제 후보로 분류한다.
- 실제 경로에서 도달 가능한 placeholder는 미완성이어도 삭제 금지다.

## 2. HOLD 기준

- route가 등록돼 있는 경우
- 메뉴에서 진입 가능한 경우
- frontend API 호출이 1건이라도 존재하는 경우
- backend controller/service/repository 중 하나라도 실연결이 존재하는 경우
- DB 테이블 영향이 존재하는 경우
- 수동 운영 스크립트로 사용될 가능성이 큰 경우

## 3. SAFE DELETE 기준

- 어떤 경로에서도 참조가 확인되지 않는다.
- 대체 canonical 경로가 존재하거나 불필요성이 명확하다.
- build 산출물, cache, artifacts, temp 성격이다.
- 삭제 후 `rg` 기준 문자열 참조가 남지 않는다.

## 4. route 정리 규칙

- 정리 순서는 `route -> import -> component -> file`를 유지한다.
- canonical route가 있으면 alias route를 먼저 제거한다.
- redirect route는 실제 화면 route와 분리해서 판단한다.
- `App.jsx`에 route가 살아 있으면 page가 placeholder라도 unsafe다.

## 5. 파일 정리 규칙

- 삭제 전 반드시 실제 파일 존재 여부를 다시 확인한다.
- 이미 없는 파일은 `skip`으로 기록하고 다시 만들거나 복구하지 않는다.
- `.venv`, `node_modules`, `dist` 같은 생성물은 단계 지시에 따라 예외 처리할 수 있다.
- docs, db, seed, 정책 파일은 cleanup 단계에서 직접 삭제하지 않는다.

## 6. mismatch 처리 규칙

- 정책 vs 코드 충돌 시 즉시 코드 수정하지 않는다.
- 먼저 `KNOWN_MISMATCHES.md`에 기록한다.
- 코드가 실제 truth인 경우 `정책 갱신 필요`로 표시한다.
- 문서가 obsolete이면 `문서 정리 필요`로 표기하되 원문은 보존한다.

## 7. 주석 규칙

- 주석 표준 용어는 `기능`, `설명`, `흐름`이다.
- JavaScript/Java는 `//` 형식, Python은 문법상 `#` 형식을 사용한다.
- 주석은 유지 코드에만 작성한다.
- 삭제 대상 파일에는 주석을 추가하지 않는다.
