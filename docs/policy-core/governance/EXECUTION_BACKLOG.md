# EXECUTION_BACKLOG.md

작성일: 2026-03-19

## 실행 원칙

- 순서는 정책 안정화 -> 인증/보안 구조 분리 -> 문서 재정렬 -> 주석 정리 순으로 간다.
- 각 단계는 DB 변경 없이 진행한다.
- AWS SES/SMS OTP는 인증 도메인 규칙을 침범하지 않고 Port-Adapter로만 도입한다.

## 1. P1 문서 기준 갱신

- 목적: 현재 SSOT와 가장 크게 어긋난 문서를 즉시 갱신해 이후 작업 기준 혼선을 제거한다.
- 선행조건:
  - `MASTER_POLICY.md`
  - `KNOWN_MISMATCHES.md`
- 영향 범위:
  - `docs/api/validation_checklist_ko.md`
  - QA/정책 안내 문서 일부
- 완료 기준:
  - 구 SQL 경로가 최신 `db/*.sql`로 교체됨
  - 현재 guard 기준점이 `App.jsx`로 명시됨
  - `/api/qr/me/sms-test` 상태가 실제 사용 기준으로 문서화됨

## 2. 인증/보안 포트-어댑터 설계 확정

- 목적: AWS SES 이메일 인증과 AWS 기반 SMS OTP를 넣어도 인증 규칙과 외부 발송 구현이 분리되도록 구조를 확정한다.
- 선행조건:
  - `AUTH_INTEGRATION_TARGET.md`
  - `SecurityConfig.java`, `SignupSessionService.java`, `PasswordResetService.java`, `PhoneVerificationService.java` 분석
- 영향 범위:
  - backend auth domain/service
  - notification sender 계층
  - infra adapter 계층
  - frontend 가입/비밀번호 재설정/프로필 이메일 변경 흐름
- 완료 기준:
  - EmailVerificationPort, SmsOtpSenderPort 등 포트 명세 확정
  - SES/SMS adapter 후보 클래스 명세 확정
  - dev expose 정책과 prod 정책 분리 명시

## 3. `/api` 호환성 레이어 정리 계획 수립

- 목적: `ApiPrefixCompatibilityFilter` 제거 가능한 목표 상태를 정의하고 신규 구현 기준을 `/api`로 고정한다.
- 선행조건:
  - 실제 호출 경로 감사
  - `MISMATCH_PRIORITY_MATRIX.md`
- 영향 범위:
  - backend filter/security
  - frontend API client
  - 외부 문서/테스트 스크립트
- 완료 기준:
  - 비 `/api` 호출 잔여 목록 확보
  - 제거 전제 조건 체크리스트 작성
  - compatibility filter 제거를 위한 단계별 계획 수립

## 4. AI moderation 정책 canonical 파일 확정

- 목적: moderation 정책 입력이 복수 JSON 공존 상태에서 벗어나 하나의 canonical 기준으로 수렴하도록 한다.
- 선행조건:
  - 정책 owner 결정
  - `pupoo_ai/policy_docs` 파일 비교
- 영향 범위:
  - `run_policy_index.py`
  - `rag_service.py`
  - policy docs
- 완료 기준:
  - canonical 정책 파일 1개 선정
  - 나머지 파일 archive/obsolete 처리 기준 수립
  - 인덱싱 스크립트 입력 규칙 명시

## 5. 감사 문서 재생성 단계

- 목적: 삭제/정리 이후 stale 상태가 된 API 감사 문서를 실제 코드 상태로 재생성한다.
- 선행조건:
  - route/API 기준 안정화
- 영향 범위:
  - `docs/api/api_match_report_ko.md`
  - `docs/api/frontend_calls.json`
  - `docs/api/backend_routes.json`
- 완료 기준:
  - `ProgramCategoryPage.jsx` 같은 삭제 대상 흔적 제거
  - 현재 route/API 구조와 문서 결과 일치

## 6. 인증 프론트 플로우 정리 설계

- 목적: 가입, 이메일 인증, OTP, 비밀번호 재설정, 마이페이지 이메일 변경 흐름을 backend target 구조와 맞춘다.
- 선행조건:
  - 인증 포트-어댑터 설계 확정
- 영향 범위:
  - `JoinNormal.jsx`
  - `KakaoJoin.jsx`
  - `KakaoOtp.jsx`
  - `FindPassword.jsx`
  - `ResetPassword.jsx`
  - `MypageProfileEdit.jsx`
  - `features/auth/api/authApi.js`
- 완료 기준:
  - 각 화면별 호출 API와 상태 전이 표 작성
  - SES/SMS 도입 시 변경 지점 명시

## 7. 주석 정제 단계

- 목적: 현재 표준 주석과 기존 Javadoc/docstring 병존 상태를 정리해 주석 표준을 완결한다.
- 선행조건:
  - `COMMENT_REFINEMENT_BACKLOG.md`
- 영향 범위:
  - backend controller/service 일부
  - AI router/service 일부
- 완료 기준:
  - 부분 완료 파일이 모두 완료 상태로 전환
  - 중복 주석 제거
  - 인코딩 깨짐 구주석 제거 또는 병합

## 8. 후순위 obsolete 문서 정리

- 목적: 즉시 기준에는 영향이 적지만 stale인 문서를 obsolete 또는 archive로 정리한다.
- 선행조건:
  - P1 문서 갱신 완료
  - API 감사 문서 재생성 완료
- 영향 범위:
  - `docs/qa/*`
  - legacy deploy/storage 메모 일부
- 완료 기준:
  - obsolete 표시 기준 통일
  - archive 대상 목록 확정

## 권장 실제 수행 순서

1. 문서 기준 갱신
2. 인증/보안 포트-어댑터 설계
3. `/api` 호환성 정리 계획
4. AI moderation canonical 정책 확정
5. 감사 문서 재생성
6. 인증 프론트 플로우 정리
7. 주석 정제
8. 후순위 obsolete 문서 정리
