# DELETE_OR_KEEP_API

## 목적

프론트 페이지 정리 시 즉시 참조할 수 있도록 `KEEP / HOLD / REMOVE`만 따로 정리한 문서다.

## KEEP

### 우선 유지 대상

- 인증/회원가입/로그인/비밀번호 재설정
- 사용자 마이페이지, 관리자 사용자 관리
- 게시판, FAQ, QnA, 리뷰, 댓글, 신고, 모더레이션
- 행사, 프로그램, 발표자, 참가 신청, 콘테스트 투표
- 부스, QR 발급/체크인/방문 이력
- 갤러리 및 일반 파일 업로드/조회
- 공지, 문의, 관심사, 알림, 결제, 환불, 반려동물
- AI 예측 조회, 분석 대시보드, 관리자 운영 대시보드

### KEEP 근거

- 실DB에 실제 테이블과 상태값이 존재한다.
- 현재 컨트롤러-서비스-리포지토리-엔티티 흐름이 연결되어 있다.
- 저장 경로 정책은 `docs/cloud-native/step-01-storage-policy.md`와 맞는다.

## HOLD

| Method | Endpoint | Controller | 사용 Entity / Table | HOLD 근거 |
|---|---|---|---|---|
| POST | `/api/admin/events/poster/generate` | `AdminEventOperationController` | 오브젝트 스토리지, `event_images` 연관 맥락 | 행사 본체 CRUD와 분리된 운영 보조 자산 생성 |
| POST | `/api/admin/events/poster/upload` | `AdminEventOperationController` | 오브젝트 스토리지, `event_images` 연관 맥락 | 행사 본체 CRUD와 분리된 운영 보조 자산 업로드 |
| POST | `/api/admin/ai/congestion/backfill` | `AiAdminController` | `ai_event_congestion_timeseries`, `ai_program_congestion_timeseries` | 페이지 직접 기능보다 운영/배치 보조 성격 |
| POST | `/api/chatbot/chat` | `ChatbotProxyController` | DB 직접 사용 없음 | 외부 AI 서비스 프록시, 실DB 기준 기능 근거 없음 |

## REMOVE

| Method | Endpoint | Controller | 사용 Entity / Table | REMOVE 근거 |
|---|---|---|---|---|
| GET | `/api/auth/secure-ping` | `AuthController` | 없음 | 코드 주석상 JWT 검증용 테스트 endpoint |
| GET | `/api/admin/dashboard/{id}` | `DashboardController` | 관리자 요약 재사용 | 코드 주석상 URL 호환성용 별칭, 실DB 개별 리소스 근거 없음 |
| POST | `/api/qr/me/sms-test` | `QrController` | 없음 | 코드 주석상 SMS 테스트/시뮬레이션 |
| POST | `/api/files/admin/notice` | `StorageController` | `StoredFile` / `files` | `AdminStorageController`와 기능 중복, `/api/admin/**` 정책 위반 |
| DELETE | `/api/files/admin/{fileId}` | `StorageController` | `StoredFile` / `files` | `AdminStorageController`와 기능 중복, `/api/admin/**` 정책 위반 |
| GET | `/api/health` | `HealthController` | 없음 | 코드 주석상 local/dev smoke-test, `actuator/health`와 역할 중복 |

## 별도 메모

### 정책/구현 불일치

- `/api/ping`
  - 보안 설정에는 permitAll 규칙이 있으나 실제 컨트롤러 구현은 없다.
  - 신규 페이지 기준 endpoint로 사용하면 안 된다.

### 권한 정책 불일치

- 현재 실DB `users.role_name`과 코드 `RoleName`, `SecurityConfig`는 모두 `SUPER_ADMIN`을 포함한다.
- 문서 원칙은 `USER / ADMIN`만 허용이므로, 프론트 페이지 권한 분기는 `SUPER_ADMIN`을 새 기능 기준으로 확장하지 않는 것이 맞다.

### 런타임 스키마 변경 리스크

- `UserRoleSchemaInitializer`는 시작 시 `ALTER TABLE users ...`와 `UPDATE users ...`를 수행할 수 있다.
- 현재 분석 단계 원칙과 충돌하므로, 후속 정리 작업 전 별도 통제가 필요하다.
