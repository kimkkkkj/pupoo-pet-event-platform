# KNOWN MISMATCHES

## 1. 구 SQL 경로 문서 참조

- 유형: 정책 vs 문서 불일치
- 근거:
  - 실제 SSOT: `C:\pupoo_workspace\db\pupoo_schema_v6.6.sql`
  - 문서: `C:\pupoo_workspace\docs\api\validation_checklist_ko.md`
  - 구경로 참조: `pupoo_backend/src/main/resources/data/pupoo_db_v5.3.sql`
- 현재 상태: 코드/운영 기준은 `db/*.sql`, 문서는 obsolete
- 조치 필요 여부: 필요
- 조치 방향: 검증 문서의 DB 기준 경로를 최신 SQL 기준으로 갱신

## 2. AI moderation 정책 파일 복수 공존

- 유형: 중복 정책
- 근거:
  - `C:\pupoo_workspace\pupoo_ai\policy_docs\moderation_rules.json`
  - `C:\pupoo_workspace\pupoo_ai\policy_docs\moderation_rules_20260313.json`
  - `C:\pupoo_workspace\pupoo_ai\scripts\run_policy_index.py`는 `policy_docs/*.json` 전체를 로드
- 현재 상태: 단일 정책 파일 기준이 코드에 고정되지 않음
- 조치 필요 여부: 필요
- 조치 방향: 정책 owner가 canonical JSON 하나를 지정하고 나머지는 archive 또는 obsolete로 분리

## 3. `/api` 정책 vs 호환성 필터 공존

- 유형: 정책 vs 코드 불일치
- 근거:
  - 정책 기준: backend API는 `/api` prefix
  - 코드: `ApiPrefixCompatibilityFilter.java`가 일부 비 `/api` 요청을 `/api`로 rewrite
- 현재 상태: 신규 기준은 `/api`지만 호환성 레이어가 동시에 살아 있음
- 조치 필요 여부: 필요
- 조치 방향: 외부 호출이 모두 `/api`로 수렴한 뒤 compatibility filter 제거 검토

## 4. 프론트 guard 기준점 분산 이력

- 유형: 문서 vs 실제 구현 불일치
- 근거:
  - 실제 truth: `C:\pupoo_workspace\pupoo_frontend\src\App.jsx`
  - 문서 흔적: `docs/qa/login_loop_stabilization_report_ko.md`에 `RequireAuth` 적용 이력
  - 현재 코드: 삭제 정리 후 `RequireAuth`, `RequireRole`, `AdminAuthGuard` 제거
- 현재 상태: 실제 guard 기준은 `PublicOnly`, `RequireAdmin`
- 조치 필요 여부: 필요
- 조치 방향: QA 문서에 현재 guard 구조를 반영

## 5. `ProgramCategoryPage.jsx` 문서 흔적

- 유형: 문서 vs 실제 구현 불일치
- 근거:
  - 실제 코드: 파일 삭제 완료
  - 문서: `docs/api/api_match_report_ko.md`, `docs/api/frontend_calls.json`에 잔존
- 현재 상태: 문서는 과거 스냅샷, 코드에는 없음
- 조치 필요 여부: 필요
- 조치 방향: API 감사 문서 재생성 또는 obsolete 표시

## 6. `POST /api/qr/me/sms-test` 제거 문서 vs 실제 사용

- 유형: 정책/문서 vs 코드 불일치
- 근거:
  - 실제 코드: `QRCheckin.jsx`에서 `/api/qr/me/sms-test` 호출
  - backend: `QrController.java`에 endpoint 유지
  - 과거 내부 문서: 제거 대상으로 기록된 흔적 존재
- 현재 상태: 실제 사용 중이므로 unsafe
- 조치 필요 여부: 필요
- 조치 방향: 정책 문서에서 테스트 endpoint인지 운영 기능인지 명시 재정의

## 7. 스토리지 정책 vs 레거시 `/uploads` 호환

- 유형: 확정 정책 vs 현재 호환 구현 공존
- 근거:
  - 정책 문서: `docs/cloud-native/step-01-storage-policy-frontend-ai.md`
  - frontend: `src/shared/utils/publicAssetUrl.js`에 `/uploads` 호환 로직 존재
  - backend: `UploadResourceConfig.java`, `StaticResourceConfig.java`, `StorageKeyNormalizer.java`
- 현재 상태: 정책은 backend 책임의 public URL, 구현은 `/uploads` 호환을 유지
- 조치 필요 여부: 필요
- 조치 방향: backend 응답 계약 정렬 후 `/uploads` compatibility 단계적 제거

## 8. 주석 형식 혼재

- 유형: 코드 표준 불일치
- 근거:
  - 일부 파일은 `// 기능/설명/흐름` 또는 `# 기능/설명/흐름`
  - 일부 파일은 기존 Javadoc/docstring 또는 인코딩 깨진 한글 주석 병존
- 현재 상태: 표준 블록은 추가됐지만 완전 통일은 미완료
- 조치 필요 여부: 필요
- 조치 방향: 후속 단계에서 기존 레거시 주석 정리 및 UTF-8 재정비
