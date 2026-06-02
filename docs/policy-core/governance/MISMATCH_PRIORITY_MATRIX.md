# MISMATCH_PRIORITY_MATRIX.md

| 항목 | 분류 | 현재 상태 | 우선순위 | 조치 방향 | 근거 파일 |
|---|---|---|---|---|---|
| 구 SQL 경로 문서 참조 | 문서 | 최신 SSOT는 `db/*.sql`인데 검증 문서가 구 경로를 가리킴 | P1 | 최신 SQL 기준으로 즉시 갱신 | `docs/api/validation_checklist_ko.md`, `db/pupoo_schema_v6.6.sql` |
| `/api` 정책 vs `ApiPrefixCompatibilityFilter` | 호환성 | 신규 기준은 `/api`지만 rewrite 필터 공존 | P1 | 호환성 제거 전제 조건 정리 후 단계적 축소 계획 수립 | `SecurityConfig.java`, `ApiPrefixCompatibilityFilter.java` |
| `POST /api/qr/me/sms-test` 제거 문서 vs 실제 사용 | 정책 | 문서상 제거 흔적 있으나 실제 프론트/백엔드 사용 중 | P1 | 운영 기능인지 테스트 기능인지 정책 재정의 후 문서 갱신 | `QrController.java`, `QRCheckin.jsx`, 내부 감사 문서 |
| 프론트 guard 기준점 문서 불일치 | 문서 | 현재 truth는 `App.jsx`, 과거 `RequireAuth` 흔적 문서 잔존 | P1 | QA/정책 문서에 현재 guard 구조 반영 | `App.jsx`, `docs/qa/login_loop_stabilization_report_ko.md` |
| AI moderation 정책 파일 복수 공존 | 정책 | `policy_docs/*.json` 전체 로드, canonical 파일 미확정 | P2 | canonical JSON 지정, archive/obsolete 분리, 인덱싱 규칙 고정 | `pupoo_ai/policy_docs/*`, `run_policy_index.py`, `rag_service.py` |
| 스토리지 정책 vs `/uploads` 호환 구현 | 호환성 | 정책은 backend public URL 책임, 구현은 `/uploads` compatibility 유지 | P2 | backend 응답 계약 정렬 후 compatibility 제거 계획 수립 | `step-01-storage-policy-frontend-ai.md`, `publicAssetUrl.js`, `UploadResourceConfig.java` |
| 주석 형식 혼재 | 주석 | 표준 블록 추가됐으나 Javadoc/docstring/구주석 병존 | P2 | 표준 블록 유지, 중복 구주석 제거 및 UTF-8 정비 | `COMMENT_STANDARD_REPORT.md`, 해당 코드 파일 |
| `ProgramCategoryPage.jsx` 문서 흔적 | 문서 | 코드에는 없고 감사 문서에만 흔적 남음 | P2 | 감사 문서 재생성 또는 obsolete 처리 | `docs/api/api_match_report_ko.md`, `docs/api/frontend_calls.json` |
| AI/main/router 표준 주석 중복 | 주석 | 일부 Python 파일에서 표준 주석과 기존 주석 중복 | P3 | 기능 영향 없는 범위에서 후순위 정리 | `main.py`, `chatbot.py`, `congestion.py`, `health.py`, `moderation.py` |
| obsolete QA/배포 문서 다수 | 문서 | 현재 구현과 직접 맞지 않는 보조 문서 존재 | P3 | obsolete 표시 또는 archive 분리 | `docs/qa/*`, `docs/frontend_s3_cloudfront_deploy.md` |

## 카테고리별 우선순위 요약

### 인증/보안
- P1: `/api` 호환성 레이어 정리 계획
- P1: `sms-test` 정책 재정의
- P2: AWS SES/SMS OTP 도입을 위한 포트-어댑터 구조 확정

### 문서
- P1: 구 SQL 경로 문서 갱신
- P1: guard 기준점 문서 갱신
- P2: 감사 문서 재생성
- P3: obsolete 문서 표시

### 주석
- P2: 표준 주석 완결
- P3: Python 중복 주석 후순위 정리

### 호환성
- P1: `ApiPrefixCompatibilityFilter`
- P2: `/uploads` compatibility 제거 계획
