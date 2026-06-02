# PUPOO Workspace Structure Audit

작성일: 2026-03-19
기준 경로: `C:\pupoo_workspace`

## 1. 루트 폴더별 역할

| 경로 | 역할 | 상태 | 메모 |
|---|---|---|---|
| `.github` | CI/CD, PR 템플릿, 협업 규칙 | KEEP | 런타임 소스 아님 |
| `.idea` | IntelliJ 로컬 설정 | HOLD | 워크스페이스 외부 산출물 성격 |
| `.metadata` | Eclipse/STS 계열 로컬 메타데이터 | HOLD | 프로젝트 핵심 소스와 무관 가능성 높음 |
| `.vscode` | 에디터 설정 | HOLD | 로컬 설정 |
| `db` | 최신 스키마/시드 SQL | KEEP | DB SSOT 우선 영역 |
| `DB_SQL(MYSQL, eXERD)` | 별도 DB 산출물 보관소 추정 | HOLD | 최신성 재확인 필요 |
| `docs` | 정책, 배포, QA, API 감사 문서 | KEEP | 일부 문서는 mismatch 존재 |
| `k8s` | 쿠버네티스 배포 베이스 | KEEP | 배포 설정 |
| `pupoo_ai` | FastAPI 기반 AI 서비스 | KEEP | `.venv`, `artifacts`, `tests`는 별도 HOLD |
| `pupoo_backend` | Spring Boot 백엔드 | KEEP | `build`, `bin`, `tools`, `uploads`는 별도 점검 필요 |
| `pupoo_frontend` | React/Vite 프론트엔드 | KEEP | `dist`, `node_modules`는 생성물 성격 |
| `scripts` | 루트 자동화 스크립트 | HOLD | smoke 존재 여부 재점검 필요 |
| `tools` | 보조 도구 모음 | HOLD | `seed-generator`는 운영 데이터 영향 가능성 있어 신중 필요 |

## 2. 주요 하위 구조 분류

### Backend

| 경로 | 분류 | 상태 | 근거 |
|---|---|---|---|
| `pupoo_backend/src/main/java` | 실제 애플리케이션 코드 | KEEP | Spring Boot 런타임 본체 |
| `pupoo_backend/src/main/resources` | 실제 설정 및 리소스 | KEEP | `application.properties`, 정적/업로드 자원 포함 |
| `pupoo_backend/src/test/java` | 테스트 코드 | HOLD | 삭제 후보일 수 있으나 참조 및 품질 영향 확인 필요 |
| `pupoo_backend/build` | Gradle 생성물 | HOLD | 생성물 |
| `pupoo_backend/bin` | IDE/빌드 산출물 추정 | HOLD | 생성물 |
| `pupoo_backend/tools` | 보조 유틸, class 파일 포함 | HOLD | `DbMetadataDump.class` 등 생성 부산물 존재 |
| `pupoo_backend/src/main/resources/uploads` | 로컬 업로드/QR 코드 저장소 | HOLD | 대량 생성 자산 |

### Frontend

| 경로 | 분류 | 상태 | 근거 |
|---|---|---|---|
| `pupoo_frontend/src` | 실제 프론트 코드 | KEEP | React 라우트와 페이지 본체 |
| `pupoo_frontend/public` | 정적 자산 | KEEP | 배포 정적 리소스 |
| `pupoo_frontend/dist` | 빌드 산출물 | HOLD | Vite 결과물 |
| `pupoo_frontend/node_modules` | 의존성 캐시 | HOLD | 생성물 |
| `pupoo_frontend/src/data/mock.js` | mock 자산 후보 | HOLD | 사용처 재확인 필요 |
| `pupoo_frontend/src/app/router/guards` | 별도 가드 모듈 | HOLD | 현재 실제 사용 여부 불명확 |

### AI

| 경로 | 분류 | 상태 | 근거 |
|---|---|---|---|
| `pupoo_ai/app` | 실제 AI 서비스 코드 | KEEP | FastAPI 진입점과 기능 모듈 |
| `pupoo_ai/policy_docs` | AI 정책 입력 문서 | KEEP | moderation 색인 소스 |
| `pupoo_ai/scripts` | 색인/보조 스크립트 | KEEP | 정책 색인 스크립트 존재 |
| `pupoo_ai/artifacts` | AI 생성 산출물 | HOLD | 자동 생성 부산물 가능성 높음 |
| `pupoo_ai/tests` | 테스트 디렉터리 | HOLD | 실질 테스트 코드 여부 낮음 |
| `pupoo_ai/.venv` | 로컬 가상환경 | HOLD | 생성물 |

### Docs and Config

| 경로 | 분류 | 상태 | 근거 |
|---|---|---|---|
| `docs/cloud-native` | 정책 문서 | KEEP | 스토리지 정책 SSOT |
| `docs/api` | API 감사 산출물 | KEEP | 코드-문서 비교 기준 |
| `docs/qa` | QA 및 smoke 체크 문서 | HOLD | 운영 검증용 문서 |
| `k8s/base` | 배포 베이스 설정 | KEEP | 런타임 인프라 설정 |
| 루트 `docker-compose.yml` | 로컬 실행 설정 | KEEP | AI + backend 연동 진입점 |
| 루트 `*.yaml`, `*.json` 배포 파일 | 인프라 설정 | HOLD | 사용 중인 배포 방식 재확인 필요 |

## 3. 즉시 눈에 띄는 위험 항목

1. `pupoo_backend/src/main/java/com/popups/pupoo/user/api/foo.tmp`
   - 소스 디렉터리 내부 임시 파일
   - 참조 여부 확인 후 정리 후보
2. 루트 `tmp_query_event17.jsh`, `tmp_query_event17_status.jsh`
   - 쿼리 실험용 임시 파일 성격
3. 루트 `smoke-ai.ps1`
   - smoke 전용 스크립트 후보
4. `pupoo_backend/tools/*.class`, `pupoo_backend/tools/__pycache__`
   - 생성 부산물
5. `pupoo_ai/__pycache__`, `pupoo_backend/tools/__pycache__`
   - Python 캐시 산출물
6. `pupoo_frontend/dist`
   - 빌드 결과물이 커밋/정리 대상인지 별도 판정 필요

## 4. placeholder 및 중복 구조 징후

- `pupoo_frontend/src/App.jsx`
  - `ComingSoon` 컴포넌트가 인라인 정의됨
  - 관리자 경로 여러 개가 실제 페이지 대신 placeholder를 렌더링함
- `pupoo_frontend/src/App.jsx`
  - `/auth/mypage/profile`와 `/auth/mypage/pjrofile`
  - `/mypage/profile`와 `/mypage/pjrofile`
  - 오탈자 호환 라우트가 공존
- `pupoo_frontend/src/app/router/guards/RequireAuth.jsx`
  - 별도 가드 존재
- `pupoo_frontend/src/pages/admin/shared/AdminAuthGuard.jsx`
  - 또 다른 관리자 가드 존재
- `pupoo_frontend/src/App.jsx`
  - 실제 관리자 가드는 인라인 `RequireAdmin`을 사용

현재 상태는 "중복 가드/중복 라우팅 로직 후보"로 분류하며 `HOLD`.

## 5. 삭제 위험 구간

- `pupoo_backend/src/main/resources/uploads`
  - 정적 파일이 아니라 데이터에 가까운 자산이 섞여 있다.
- `pupoo_frontend/dist`
  - 백엔드 빌드 파이프라인에서 통합 자원으로 사용될 수 있다.
- `tools/seed-generator`
  - seed와 AI 데이터셋 생성에 연결될 수 있으므로 DB 정합성 관점에서 주의.
- `pupoo_ai/policy_docs`
  - moderation 규칙 색인 입력 경로라 임의 정리 금지.

## 6. 이번 단계 결론

- 워크스페이스는 실제 런타임 코드와 로컬 생성물이 강하게 혼재된 상태다.
- 2단계에서는 생성물과 실제 운영 경로를 더 강하게 분리하는 참조 감사가 필요하다.
- 실제 삭제 전에는 `라우트 -> 페이지 -> API -> 백엔드 컨트롤러 -> DB 테이블` 순으로 역참조를 다시 확인해야 한다.
