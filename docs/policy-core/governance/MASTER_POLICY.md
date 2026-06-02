# MASTER POLICY

작성일: 2026-03-19  
범위: `C:\pupoo_workspace`

## 1. 정책 우선순위

1. 최신 SQL
   - `C:\pupoo_workspace\db\pupoo_schema_v6.6.sql`
   - `C:\pupoo_workspace\db\pupoo_seed_v6.6_practical_image_urls_rewritten.sql`
2. 확정 정책 문서
   - `C:\pupoo_workspace\docs\cloud-native\step-01-storage-policy-frontend-ai.md`
3. 백엔드 아키텍처와 실행 설정
   - `C:\pupoo_workspace\pupoo_backend\src\main\resources\application.properties`
   - `C:\pupoo_workspace\pupoo_backend\src\main\java\com\popups\pupoo\auth\security\config\SecurityConfig.java`
   - `C:\pupoo_workspace\pupoo_backend\src\main\java\com\popups\pupoo\auth\security\web\ApiPrefixCompatibilityFilter.java`
4. 프론트 구조와 실제 라우팅
   - `C:\pupoo_workspace\pupoo_frontend\src\main.jsx`
   - `C:\pupoo_workspace\pupoo_frontend\src\App.jsx`
5. 기타 문서
   - `docs/api/*`
   - `docs/qa/*`
   - 루트 보고서류

## 2. DB 정합성 원칙

- DB 스키마 기준은 항상 `db/pupoo_schema_v6.6.sql`이다.
- seed 기준은 `db/pupoo_seed_v6.6_practical_image_urls_rewritten.sql`이다.
- JPA는 `ddl-auto=validate` 기준으로 스키마를 검증하며, 코드가 SQL과 어긋나면 코드가 아니라 mismatch로 먼저 기록한다.
- 운영 데이터, 스키마, seed 변경은 별도 단계에서만 수행한다.
- 문서가 구 SQL 경로를 가리키더라도 SSOT는 `db/*.sql`이다.

## 3. API 규칙

- 백엔드 공개/업무 API 기본 prefix는 `/api`다.
- 관리자 API 기준 경로는 `/api/admin/**`다.
- 내부 AI 연동이나 내부 제어 경로는 `/internal/**`다.
- 프론트 라우트 truth는 `App.jsx`이며, route 정의가 없으면 문서에 있더라도 실제 경로로 보지 않는다.
- route -> page -> component -> api -> backend controller -> DB table 순서로만 연결을 인정한다.
- 테스트성 endpoint라도 실제 프론트 호출이 존재하면 정책보다 코드 기준으로 `HOLD` 처리한다.

## 4. 인증/보안 규칙

- 인증 기준 설정은 `SecurityConfig.java`다.
- 공개 API, 관리자 API, 사용자 API 권한 매핑은 `SecurityConfig.java`를 우선한다.
- refresh cookie 정책은 `application.properties`의 `auth.refresh.cookie.*`를 기준으로 한다.
- SPA 접근 허용은 `spaRouteMatcher()` 기준이며, 인증 정책과 충돌 시 mismatch로 기록한다.
- `ApiPrefixCompatibilityFilter`는 호환성 레이어다. 신규 구현 기준은 `/api` prefix를 명시적으로 사용하는 것이다.

## 5. 프론트 라우팅 구조

- 프론트 라우팅 SSOT는 `pupoo_frontend/src/App.jsx`다.
- guard truth도 현재는 `App.jsx` 내부 `PublicOnly`, `RequireAdmin`이다.
- 별도 guard 파일이 존재해도 실제 import되지 않으면 구조 기준으로 인정하지 않는다.
- legacy route는 redirect가 남아 있어도 실제 화면 컴포넌트와 별개로 관리한다.
- 메뉴 연결 여부는 `SiteHeader.jsx`, `Mypage.jsx`, 관리자 진입은 `Dashboard.jsx`와 `App.jsx` 조합으로 확인한다.

## 6. 관리자 규칙

- 관리자 화면 route는 `App.jsx`에서 보호된 route로 정의한다.
- 관리자 기능 API는 `/api/admin/**`를 우선 규칙으로 본다.
- 관리자 placeholder route는 기능 미완료 상태여도 실제 등록 route면 삭제 금지다.
- 관리자 대시보드 내부 탭으로만 접근하는 화면도 실제 사용 중으로 본다.

## 7. 스토리지 규칙

- 스토리지 SSOT는 `application.properties`의 `app.storage.*`다.
- 프론트는 스토리지 key로 public URL을 직접 조합하지 않는다.
- 프론트는 backend가 반환한 최종 public URL 또는 backend가 공개한 root-relative 경로만 렌더링한다.
- `/uploads`는 현재 호환 계층으로 남아 있으며, 신규 기준은 backend 책임의 public URL 반환이다.
- AI 파일은 public URL을 직접 만들지 않고 storage boundary 또는 backend를 통해서만 외부에 노출한다.

## 8. AI 규칙

- AI 진입점은 `pupoo_ai/app/main.py`다.
- router truth는 `pupoo_ai/app/api/routers/*.py` 중 `main.py`가 include하는 모듈이다.
- moderation 정책 입력은 `pupoo_ai/policy_docs`이지만, 현재는 복수 JSON 공존 상태이므로 단일 파일 기준은 아직 확정되지 않았다.
- 정책 인덱싱 기준은 `pupoo_ai/scripts/run_policy_index.py`와 `pupoo_ai/app/features/moderation/rag_service.py` 조합이다.
- AI가 생성한 로컬 경로나 절대 파일 경로는 외부 응답 값으로 사용하지 않는다.

## 9. 문서 해석 원칙

- 문서가 실제 코드와 다르면 코드 연결 관계를 우선 기록하고 문서는 mismatch로 남긴다.
- 감사 문서와 QA 문서는 SSOT가 아니라 검증 보조 자료다.
- 삭제 판단은 문서 문구가 아니라 실제 참조 관계 기준으로만 수행한다.
