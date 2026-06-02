# PUPOO Source Of Truth Map

작성일: 2026-03-19

## 1. Backend Source of Truth

### 진입점

- 애플리케이션 부트스트랩
  - `pupoo_backend/src/main/java/com/popups/pupoo/PupooBackendApplication.java`
- 런타임 설정
  - `pupoo_backend/src/main/resources/application.properties`
  - `pupoo_backend/src/main/resources/application-prod.properties`
- 보안 및 라우팅 정책
  - `pupoo_backend/src/main/java/com/popups/pupoo/auth/security/config/SecurityConfig.java`
  - `pupoo_backend/src/main/java/com/popups/pupoo/auth/security/web/ApiPrefixCompatibilityFilter.java`
  - `pupoo_backend/src/main/java/com/popups/pupoo/common/config/SpaForwardController.java`

### 실제 라우트 기준

- 컨트롤러 소스 전체
  - `pupoo_backend/src/main/java/com/popups/pupoo/**/api/*Controller.java`
- 감사 기준 문서
  - `docs/api/backend_routes.json`
  - `docs/api/api_match_report_ko.md`

### DB 기준

- 최신 스키마 SSOT
  - `db/pupoo_schema_v6.6.sql`
- 최신 시드 SSOT
  - `db/pupoo_seed_v6.6_practical_image_urls_rewritten.sql`

## 2. Frontend Source of Truth

### 진입점

- React 부트스트랩
  - `pupoo_frontend/src/main.jsx`
- 실제 라우트 정의
  - `pupoo_frontend/src/App.jsx`
- 레이아웃
  - `pupoo_frontend/src/layouts/SiteLayout.jsx`
  - `pupoo_frontend/src/layouts/AdminLayout.jsx`
- 개발 서버 및 프록시 설정
  - `pupoo_frontend/vite.config.js`

### 현재 실제 라우팅 판단

- 실사용 라우트 기준점은 `src/App.jsx`다.
- `src/app/router/guards/RequireAuth.jsx`와 `src/app/router/guards/RequireRole.jsx`는 존재하지만 현재 `App.jsx` 라우트 트리에 직접 연결되어 있지 않다.
- 관리자 인증은 별도 `AdminAuthGuard.jsx`도 있으나, 실제 `App.jsx`는 인라인 `RequireAdmin`을 사용한다.

### 정리 시 특별 주의 경로

- `pupoo_frontend/src/App.jsx`
  - 관리자 placeholder 경로 다수 존재
  - 레거시/오탈자 라우트가 혼재
- `pupoo_frontend/src/api/**`
  - 구 API 레이어와 `src/app/http/**`, `src/features/**/api/**`가 병행된다.

## 3. AI Source of Truth

### 진입점

- FastAPI 앱 생성
  - `pupoo_ai/app/main.py`
- 로컬 실행 지점
  - `pupoo_ai/README.md`
  - `pupoo_ai/run_server.bat`
- 컨테이너 실행
  - `pupoo_ai/Dockerfile`
  - 루트 `docker-compose.yml`

### 실제 라우트 기준

- `pupoo_ai/app/api/routers/*.py`
  - `app/main.py`가 동적으로 모두 include 한다.
- 현재 확인된 라우터
  - `chatbot.py`
  - `congestion.py`
  - `health.py`
  - `moderation.py`

### 정책 기준점

- AI moderation 정책 입력 경로
  - `pupoo_ai/policy_docs/*.json`
- 색인 실행 기준
  - `pupoo_ai/scripts/run_policy_index.py`
  - `pupoo_ai/app/features/moderation/index_policies.py`

### mismatch

- `moderation_rules.json`와 `moderation_rules_20260313.json`가 동시에 존재한다.
- 현재 코드는 특정 파일 하나를 고정하지 않고 `policy_docs` 전체를 읽는다.
- 따라서 "최신 단일 정책 문서"가 아직 코드 수준에서 확정되지 않았다.

## 4. 정책 문서 기준점

### 우선 채택 문서

1. `db/pupoo_schema_v6.6.sql`
2. `docs/cloud-native/step-01-storage-policy-frontend-ai.md`
3. `docs/api/api_match_report_ko.md`
4. `docs/api/backend_routes.json`
5. `docs/api/frontend_calls.json`

### 참고 문서

- `docs/api/validation_checklist_ko.md`
- `docs/api/ui_template_consistency_report_ko.md`
- `docs/api/mypage_rebuild_report_ko.md`
- `docs/qa/production_smoke_checklist_ko.md`
- `docs/qa/realtime_change_guard_ko.md`

### 문서 기준 mismatch

- `docs/api/validation_checklist_ko.md`는 오래된 DB 경로를 가리킨다.
- QA 문서는 검증 절차 문서이므로 SSOT가 아니라 보조 검증 기준으로만 사용해야 한다.

## 5. 정리 작업용 참조 재확인 포인트

1. 프론트 페이지 삭제 전
   - `src/App.jsx` 라우트 참조
   - 메뉴 링크 참조
   - API 호출 참조
2. 백엔드 코드 삭제 전
   - 컨트롤러 매핑
   - 서비스/리포지토리 연결
   - 스키마 테이블 존재 여부
3. AI 파일 삭제 전
   - 라우터 include 여부
   - `policy_docs` 색인 경로 포함 여부
4. 문서 삭제 전
   - 최신 정책 문서인지
   - 단순 감사 결과물인지
   - 운영 또는 배포 절차에 연결되는지

## 6. 이번 단계 결론

- 백엔드 SSOT는 `db`와 `pupoo_backend/src/main` 조합이다.
- 프론트 SSOT는 `pupoo_frontend/src/main.jsx`와 `pupoo_frontend/src/App.jsx`다.
- AI SSOT는 `pupoo_ai/app/main.py`와 `pupoo_ai/app/api/routers/*`다.
- 정책 SSOT는 DB SQL과 cloud-native 정책 문서가 우선이며, AI moderation 정책은 중복 파일 공존으로 인해 후속 정리가 필요하다.
