# PUPOO Workspace Cleanup Plan

작성일: 2026-03-19
범위: `C:\pupoo_workspace` 전체
원칙: 이번 단계는 분석과 계획만 수행하며 실제 삭제는 하지 않는다.

## 1. 목표

1. 필요 없는 코드 및 페이지 완전 삭제
2. 프로젝트 내부 정책의 적절한 통합
3. 프로젝트와 관련없는 파일, smoke/test 전용 파일, placeholder, 생성 부산물, 미사용 mock/legacy/helper, 중복 라우트 및 중복 정책 정리

## 2. 정책 우선순위

1. `db/pupoo_schema_v6.6.sql`
2. `db/pupoo_seed_v6.6_practical_image_urls_rewritten.sql`
3. 런타임 진입점과 실제 설정 파일
   - `pupoo_backend/src/main/resources/application.properties`
   - `pupoo_backend/src/main/java/com/popups/pupoo/auth/security/config/SecurityConfig.java`
   - `pupoo_backend/src/main/java/com/popups/pupoo/common/config/SpaForwardController.java`
   - `pupoo_frontend/src/main.jsx`
   - `pupoo_frontend/src/App.jsx`
   - `pupoo_ai/app/main.py`
   - `docker-compose.yml`
4. 최신 정책 문서
   - `docs/cloud-native/step-01-storage-policy-frontend-ai.md`
   - `pupoo_ai/policy_docs/moderation_rules_20260313.json`
5. 보조 감사 문서
   - `docs/api/api_match_report_ko.md`
   - `docs/api/backend_routes.json`
   - `docs/api/frontend_calls.json`
   - `docs/api/validation_checklist_ko.md`
   - `docs/qa/*`

## 3. 현재 단계 판단

- `KEEP`
  - `pupoo_backend/src/main/**`
  - `pupoo_frontend/src/**`
  - `pupoo_ai/app/**`
  - `db/**`
  - `docs/cloud-native/**`
  - `docs/api/**`
- `HOLD`
  - `pupoo_frontend/dist/**`
  - `pupoo_frontend/node_modules/**`
  - `pupoo_ai/.venv/**`
  - `pupoo_backend/build/**`
  - `pupoo_backend/bin/**`
  - `pupoo_backend/src/main/resources/uploads/**`
  - `pupoo_ai/artifacts/**`
  - `tools/seed-generator/**`
  - `.idea/**`
  - `.metadata/**`
  - 루트의 `tmp_query_event17.jsh`, `tmp_query_event17_status.jsh`, `smoke-ai.ps1`

현재 단계에서는 `DELETE`와 `REMOVE`를 확정하지 않는다. 이유는 참조 재확인 절차가 아직 남아 있기 때문이다.

## 4. 핵심 mismatch 기록

1. `docs/api/validation_checklist_ko.md`는 구 경로 `pupoo_backend/src/main/resources/data/pupoo_db_v5.3.sql`를 기준으로 적혀 있고, 실제 최신 SQL SSOT는 `db/pupoo_schema_v6.6.sql`이다.
2. `pupoo_ai/policy_docs` 아래에 `moderation_rules.json`와 `moderation_rules_20260313.json`가 공존한다. 현재 AI 색인 스크립트는 `policy_docs/*.json`을 모두 읽으므로 단일 정책 기준점이 불명확하다.
3. 프론트 라우팅과 가드가 한 곳에 수렴되어 있지 않다.
   - 실제 라우트는 `pupoo_frontend/src/App.jsx`
   - 별도 가드 파일은 `pupoo_frontend/src/app/router/guards/*`
   - 별도 관리자 가드 UI는 `pupoo_frontend/src/pages/admin/shared/AdminAuthGuard.jsx`
4. 백엔드는 `/api` 기준으로 설계되어 있지만 `ApiPrefixCompatibilityFilter`가 비 `/api` GET/HEAD 요청 일부를 재작성한다. 라우트 정리 시 호환성 레이어를 같이 확인해야 한다.

## 5. 삭제 위험 구간

- `pupoo_backend/src/main/resources/uploads/**`
  - 로컬 업로드 및 QR 이미지가 대량 존재한다.
  - 운영/데모 의존 가능성이 있어 즉시 삭제 금지.
- `pupoo_frontend/dist/**`
  - 백엔드 Gradle이 프론트 빌드를 통합해 정적 리소스로 포함한다.
- `pupoo_frontend/node_modules/**`, `pupoo_ai/.venv/**`, `pupoo_backend/build/**`, `pupoo_backend/bin/**`
  - 생성물 성격이 강하지만 현재 IntelliJ 작업 상태와 로컬 실행 흐름에 연결될 수 있다.
- `tools/seed-generator/**`
  - 운영 데이터 변경은 금지 대상이므로 사용 여부를 먼저 분리해야 한다.
- 관리자 placeholder 라우트
  - `pupoo_frontend/src/App.jsx`의 `ComingSoon` 경로는 후보이나, 메뉴/링크/권한 흐름을 확인한 뒤에만 삭제 가능하다.

## 6. 이후 단계 실행 순서

1. 2단계: 라우트, 가드, API 호출, 페이지 참조 관계를 기능별로 분해하고 `DELETE` 후보 목록 작성
2. 3단계: 정책 문서와 코드 구현의 불일치 목록 확정, 통합 기준 문서 작성
3. 4단계: 생성 부산물, temp, smoke, mock, IDE 산출물의 참조 재확인
4. 5단계: 실제 삭제 직전 재검증
5. 6단계: 파일 삭제 및 코드 제거 수행
6. 7단계: `REMOVE` 결과 문서 작성과 빌드 검증

## 7. 다음 단계 산출물 제안

- `DELETE_CANDIDATE_MATRIX.md`
- `POLICY_MISMATCH_REGISTER.md`
- `ROUTE_AND_GUARD_REFERENCE_AUDIT.md`
