# BACKEND_FEATURE_INVENTORY

## 범위

- 작성 기준일: 2026-03-19
- 기준 소스:
  - 실DB AWS RDS `pupoodb` 메타데이터 조회 결과
  - `docs/cloud-native/step-01-storage-policy.md`
  - `src/main/resources/.env` 성격의 현재 `.env`
  - `src/main/java/com/popups/pupoo/**` 컨트롤러, 서비스, 리포지토리, 엔티티, 보안 설정
- 금지 사항 준수:
  - DDL/DML 미실행
  - RDS는 `information_schema` 조회만 수행

## 판단 규칙

- `KEEP`: 실DB 테이블/컬럼/상태값과 현재 코드가 정합하고, 엔드포인트가 실제 기능으로 구현되어 있음
- `HOLD`: 코드와 실DB 근거는 있으나 운영 보조/외부 연동/프론트 연결 보류 성격이 강함
- `REMOVE`: 테스트성, 호환성용 중복 경로, 정책 불일치 경로, 실질적 중복 기능

## 핵심 결론

### 1. JPA 매핑 기준 정합성

실DB와 현재 엔티티의 주요 JPA 매핑은 전반적으로 맞아 있다. 특히 아래 도메인은 테이블명 차이가 있어도 엔티티 `@Table`로 실DB와 정합하게 연결된다.

| 도메인 | 엔티티 예시 | 실DB 테이블 | 판단 |
|---|---|---|---|
| 사용자/인증 | `User`, `SignupSession`, `RefreshToken`, `PasswordResetToken` | `users`, `signup_sessions`, `refresh_token`, `password_reset_token` | KEEP |
| 게시판 | `Board`, `Post`, `Review` | `boards`, `posts`, `reviews` | KEEP |
| 행사 | `Event`, `EventRegistration`, `EventHistory` | `event`, `event_apply`, `event_history` | KEEP |
| 프로그램 | `Program`, `ProgramApply`, `ProgramParticipationStat` | `event_program`, `event_program_apply`, `program_participation_stats` | KEEP |
| 부스/QR | `Booth`, `BoothWait`, `QrCode`, `QrCheckin` | `booths`, `booth_waits`, `qr_codes`, `qr_logs` | KEEP |
| 갤러리 | `Gallery`, `GalleryImage`, `GalleryLike` | `galleries`, `gallery_images`, `gallery_likes` | KEEP |
| 결제/환불 | `Payment`, `PaymentTransaction`, `Refund` | `payments`, `payment_transactions`, `refunds` | KEEP |
| 알림 | `Notification`, `NotificationInbox`, `NotificationSend`, `NotificationSettings` | `notification`, `notification_inbox`, `notification_send`, `notification_settings` | KEEP |
| 문의/관심사/반려동물 | `Inquiry`, `InquiryAnswer`, `Interest`, `UserInterestSubscription`, `Pet` | `inquiries`, `inquiry_answers`, `interests`, `user_interest_subscriptions`, `pet` | KEEP |
| 신고/댓글 | `ContentReport`, `PostComment`, `ReviewComment` | `content_reports`, `post_comments`, `review_comments` | KEEP |
| AI | `AiEventCongestionTimeseries`, `AiProgramCongestionTimeseries`, `AiPredictionLog`, `EventCongestionPolicy` | `ai_event_congestion_timeseries`, `ai_program_congestion_timeseries`, `ai_prediction_logs`, `event_congestion_policy` | KEEP |

### 2. 실DB에는 있으나 JPA 엔티티가 아닌 테이블

| 실DB 테이블 | 현재 코드 사용 방식 | 판단 근거 | 메모 |
|---|---|---|---|
| `admin_notification` | `AdminNotificationRepository`가 `JdbcTemplate`로 직접 사용 | 실DB + 코드 | 엔티티 없음, JPA `validate` 범위 밖 |
| `congestions` | AI/대시보드/부스 혼잡도 쿼리 리포지토리가 native SQL로 조회 | 실DB + 코드 | 지원 테이블 |
| `event_images` | 직접 엔티티 없음, 스토리지 정규화/포스터 자산 맥락에서 참조 | 실DB + 정책서 + 코드 | 이미지 키 호환 테이블로 보임 |
| `ai_training_dataset` | 현재 API/엔티티/리포지토리 직접 사용 흔적 없음 | 실DB + 코드 | 지원/배치용 잔존 테이블 가능성, API 근거 없음 |

### 3. 정책 불일치 및 구조 리스크

| 항목 | 근거 | 판단 |
|---|---|---|
| `USER / ADMIN 외 권한 확장 금지` 원칙과 달리 `SUPER_ADMIN`이 실DB와 코드에 모두 존재 | 실DB `users.role_name enum('USER','ADMIN','SUPER_ADMIN')`, `RoleName`, `SecurityConfig`, `UserRoleSchemaInitializer` | 정책 불일치 |
| 관리자 기능은 `/api/admin/**` 유지 원칙인데 `StorageController`에 `/api/files/admin/**` 경로가 존재 | 코드 `StorageController` | 정책 불일치 |
| `SecurityConfig`와 `EndpointPolicy`는 `/api/ping`을 허용하지만 실제 컨트롤러 구현 없음 | 코드 `SecurityConfig`, `EndpointPolicy`, 전체 컨트롤러 스캔 | 정책/구현 불일치 |
| `UserRoleSchemaInitializer`는 시작 시 `ALTER TABLE`, `UPDATE users` 수행 가능 | 코드 `UserRoleSchemaInitializer` | 현재 분석 단계 원칙과 충돌하는 런타임 컴포넌트 |

## 도메인별 실제 기능 인벤토리

### 인증/사용자

| 도메인 | Controller | 실제 엔드포인트 묶음 | 사용 Entity / Table | 상태 | 판단 근거 |
|---|---|---|---|---|---|
| Auth | `AuthController` | 회원가입 시작/OTP/이메일/완료, 로그인, 리프레시, 로그아웃, 비밀번호 재설정 | `User`/`users`, `SignupSession`/`signup_sessions`, `RefreshToken`/`refresh_token`, `PasswordResetToken`/`password_reset_token` | KEEP | 실DB + 코드 |
| Auth | `AuthController` | `GET /api/auth/secure-ping` | 없음 | REMOVE | 코드상 JWT 테스트용, 실DB 근거 없음 |
| Auth | `AuthVerificationController` | 이메일/휴대폰 인증 및 변경 | `User`/`users`, `EmailVerificationToken`/`email_verification_token`, `PhoneVerificationToken`/`phone_verification_token` | KEEP | 실DB + 코드 |
| User | `UserController` | 내 정보 조회/수정/탈퇴, 닉네임 중복 확인 | `User`/`users` | KEEP | 실DB + 코드 |
| User | `AdminUserController` | 관리자 사용자 목록/상세/등록/수정/삭제 | `User`/`users` | KEEP | 실DB + 코드 |
| Social | `SocialAccountController` | 연동 계정 조회/연결/해제 | `SocialAccount`/`social_account` | KEEP | 실DB + 코드 |

### 게시판/신고/댓글

| 도메인 | Controller | 실제 엔드포인트 묶음 | 사용 Entity / Table | 상태 | 판단 근거 |
|---|---|---|---|---|---|
| Board | `BoardController` | 게시판 목록, 관리자 게시판 생성/상세/수정/활성화 | `Board`/`boards` | KEEP | 실DB + 코드 |
| Post | `PostController` | 게시글 목록/상세/신고/등록/수정/삭제/종료, 등록/수정 성공 응답 `PostResponse` | `Post`/`posts`, `StoredFile`/`files`, `ContentReport`/`content_reports` | KEEP | 실DB + 코드 |
| Post | `AdminPostController` | 게시글 관리자 삭제 처리 | `Post`/`posts` | KEEP | 실DB + 코드 |
| FAQ | `FaqController`, `AdminFaqController` | FAQ 조회/관리 | `Post`/`posts`, `Board`/`boards` | KEEP | 실DB + 코드 |
| QnA | `QnaController`, `AdminQnaController` | QnA 등록/조회/수정/삭제/종료, 답변 등록/삭제 | `Post`/`posts`, `Board`/`boards` | KEEP | 실DB + 코드 |
| Review | `ReviewController` | 리뷰 등록/조회/수정/삭제/신고 | `Review`/`reviews`, `ContentReport`/`content_reports` | KEEP | 실DB + 코드 |
| Reply | `ReplyController` | 댓글 등록/조회/수정/삭제/신고 | `PostComment`/`post_comments`, `ReviewComment`/`review_comments`, `ContentReport`/`content_reports` | KEEP | 실DB + 코드 |
| Moderation | `AdminModerationController` | 게시글/리뷰/댓글 모더레이션 | `Post`/`posts`, `Review`/`reviews`, `PostComment`/`post_comments`, `ReviewComment`/`review_comments`, `AdminLog`/`admin_logs` | KEEP | 실DB + 코드 |
| Report | `AdminReportController` | 신고 목록/상세/처리 | `ContentReport`/`content_reports`, `AdminLog`/`admin_logs` | KEEP | 실DB + 코드 |
| Report | `ReportReasonController` | 신고 사유 코드 조회 | `ContentReport` enum 맥락 | KEEP | 실DB enum + 코드 |
| Banned Word | `AdminBannedWordController` | 금칙어 목록/등록/수정/삭제 | `BannedWord`/`board_banned_words`, `BoardFilterPolicy`/`board_filter_policy`, `BoardBannedLog`/`board_banned_logs` | KEEP | 실DB + 코드 |

### 행사/프로그램/부스/QR

| 도메인 | Controller | 실제 엔드포인트 묶음 | 사용 Entity / Table | 상태 | 판단 근거 |
|---|---|---|---|---|---|
| Event | `EventController` | 행사 목록/상세/종료행사 통계/행사별 갤러리 | `Event`/`event`, `Gallery`/`galleries` | KEEP | 실DB + 코드 |
| Event | `AdminEventOperationController` | 관리자 행사 CRUD/상태 변경 | `Event`/`event` | KEEP | 실DB + 코드 |
| Event Asset | `AdminEventOperationController` | 포스터 생성/업로드 | 오브젝트 스토리지, `event_images` 연관 맥락 | HOLD | 정책서 + 코드, 실DB 직접 CRUD 근거 약함 |
| Event Registration | `EventRegistrationController` | 행사 신청/취소/내 신청 목록 | `EventRegistration`/`event_apply` | KEEP | 실DB + 코드 |
| Program | `ProgramController` | 행사별 프로그램 목록, 프로그램 상세 | `Program`/`event_program` | KEEP | 실DB + 코드 |
| Program | `ProgramAdminController` | 프로그램 생성/수정/삭제 | `Program`/`event_program` | KEEP | 실DB + 코드 |
| Speaker | `ProgramSpeakerController`, `SpeakerController`, `SpeakerAdminController` | 발표자 목록/상세/관리 | `Speaker`/`speakers`, `ProgramSpeakerMapping`/`program_speakers` | KEEP | 실DB + 코드 |
| Program Apply | `ProgramApplyController` | 내 신청 목록, 후보자 조회, 신청, 취소, 상세 | `ProgramApply`/`event_program_apply`, `ProgramParticipationStat`/`program_participation_stats` | KEEP | 실DB + 코드 |
| Vote | `ContestVoteController` | 콘테스트 투표/취소/집계 | `ContestVote`/`contest_votes`, `ProgramApply`/`event_program_apply` | KEEP | 실DB + 코드 |
| Booth | `BoothController` | 행사별 부스 목록, 부스 상세 | `Booth`/`booths`, `BoothWait`/`booth_waits` | KEEP | 실DB + 코드 |
| QR | `QrController` | 내 QR 발급/다운로드, 부스 방문 기록 조회 | `QrCode`/`qr_codes`, `QrCheckin`/`qr_logs`, `Booth`/`booths` | KEEP | 실DB + 코드 |
| QR | `QrController` | `POST /api/qr/me/sms-test` | 없음 | REMOVE | 코드상 테스트/시뮬레이션 |
| QR Admin | `QrAdminController` | 체크인/체크아웃 운영 API | `QrCheckin`/`qr_logs`, `QrCode`/`qr_codes` | KEEP | 실DB + 코드 |

### 갤러리/스토리지

| 도메인 | Controller | 실제 엔드포인트 묶음 | 사용 Entity / Table | 상태 | 판단 근거 |
|---|---|---|---|---|---|
| Gallery | `GalleryController`, `GalleryAdminController` | 갤러리 조회/등록/수정/삭제/신고/좋아요/관리 | `Gallery`/`galleries`, `GalleryImage`/`gallery_images`, `GalleryLike`/`gallery_likes`, `ContentReport`/`content_reports` | KEEP | 실DB + 코드 |
| Gallery Asset | `GalleryImageUploadController` | 갤러리 이미지 업로드 | `StoredFile`/스토리지 키 기반 업로드 | KEEP | 정책서 + 코드 |
| Storage | `StorageController` | 일반 파일 업로드/조회/다운로드/삭제 | `StoredFile`/`files` | KEEP | 실DB + 정책서 + 코드 |
| Storage | `AdminStorageController` | 관리자 공지 첨부 업로드/강제 삭제 | `StoredFile`/`files` | KEEP | 실DB + 코드 |
| Storage | `StorageController` | `/api/files/admin/notice`, `/api/files/admin/{fileId}` | `StoredFile`/`files` | REMOVE | `/api/admin/**` 정책 위반 + 관리자 기능 중복 |

### 공지/문의/관심사/알림/결제/반려동물

| 도메인 | Controller | 실제 엔드포인트 묶음 | 사용 Entity / Table | 상태 | 판단 근거 |
|---|---|---|---|---|---|
| Notice | `NoticeController`, `AdminNoticeController` | 공지 조회/관리 | `Notice`/`notices`, `StoredFile`/`files` | KEEP | 실DB + 코드 + 정책서 |
| Inquiry | `InquiryController` | 문의 등록/내 문의/상세/수정/종료, 관리자 목록/답변/상태변경 | `Inquiry`/`inquiries`, `InquiryAnswer`/`inquiry_answers` | KEEP | 실DB + 코드 |
| Interest | `InterestController` | 관심사 목록/구독/해지/채널 변경/내 구독 조회 | `Interest`/`interests`, `UserInterestSubscription`/`user_interest_subscriptions` | KEEP | 실DB + 코드 |
| Notification | `NotificationController` | 읽지 않음 수, 목록, 클릭, 설정 조회/변경 | `Notification`/`notification`, `NotificationInbox`/`notification_inbox`, `NotificationSettings`/`notification_settings` | KEEP | 실DB + 코드 |
| Notification Admin | `AdminNotificationController` | 초안 목록/생성/수정/삭제/발송, 이벤트/브로드캐스트 발송 | `admin_notification`, `Notification`/`notification`, `NotificationInbox`/`notification_inbox`, `NotificationSend`/`notification_send` | KEEP | 실DB + 코드 |
| Payment | `PaymentController`, `AdminPaymentsController` | 결제 요청/내역/승인/취소, 관리자 결제 조회/환불 요청 | `Payment`/`payments`, `PaymentTransaction`/`payment_transactions`, `Refund`/`refunds` | KEEP | 실DB + 코드 |
| Refund | `RefundController`, `AdminRefundsController` | 환불 요청/내역, 승인/거절/실행 | `Refund`/`refunds`, `Payment`/`payments` | KEEP | 실DB + 코드 |
| Pet | `PetController` | 반려동물 등록/내 목록/수정/삭제 | `Pet`/`pet` | KEEP | 실DB + 코드 |

### AI/대시보드/공통 운영

| 도메인 | Controller | 실제 엔드포인트 묶음 | 사용 Entity / Table | 상태 | 판단 근거 |
|---|---|---|---|---|---|
| AI Public | `AiController` | 행사/프로그램 혼잡도 예측, 프로그램 추천 | `ai_event_congestion_timeseries`, `ai_program_congestion_timeseries`, `ai_prediction_logs`, `event_congestion_policy`, `congestions` | KEEP | 실DB + 코드 |
| AI Admin | `AiAdminController` | 관리자 혼잡도 예측/행사별 프로그램 혼잡도 조회 | 위와 동일 | KEEP | 실DB + 코드 |
| AI Admin | `AiAdminController` | `POST /api/admin/ai/congestion/backfill` | AI 시계열 테이블 | HOLD | 실DB + 코드, 배치/운영 보조 성격 |
| Analytics | `PublicAnalyticsController`, `AdminAnalyticsController` | 행사 분석/시간대별 혼잡도/연간 통계 | `event`, `payments`, `congestions`, AI 시계열 | KEEP | 실DB + 코드 |
| Dashboard | `AdminDashboardController`, `DashboardController`, `AdminDashboardRealtimeController`, `PublicDashboardRealtimeController` | 관리자 요약, 행사/프로그램/부스 관리, 실시간 혼잡도 조회 | `users`, `event`, `event_program`, `booths`, `event_program_apply`, `payments`, `refunds`, `inquiries`, `notices`, `congestions` | KEEP | 실DB + 코드 |
| Dashboard | `DashboardController` | `GET /api/admin/dashboard/{id}` | 위 요약 데이터 재사용 | REMOVE | 코드상 호환성용 별칭 |
| Chatbot | `ChatbotProxyController` | `/api/chatbot/chat`, `/api/admin/chatbot/chat` | DB 직접 사용 없음, 외부 AI 서비스 프록시 | HOLD | 사용자/관리자 경로 분리, 관리자 경로는 `/api/admin/**` 사용 |
| Audit | `AdminLogAdminController` | 관리자 로그 목록 | `AdminLog`/`admin_logs` | KEEP | 실DB + 코드 |
| Health | `HealthController` | `/api/health` | 없음 | REMOVE | 코드상 local/dev smoke-test, `actuator/health`와 중복 |
| SPA | `SpaForwardController` | 비 API 정적 라우팅 포워드 | 없음 | 제외 | 페이지 라우팅용, API 인벤토리 대상 아님 |

## 실DB ENUM 상태값 확인 결과

실DB 기준으로 현재 코드와 직접 대조한 주요 상태값은 다음과 같다.

| 구분 | 실DB 값 | 코드 값 | 판단 |
|---|---|---|---|
| `users.role_name` | `USER`, `ADMIN`, `SUPER_ADMIN` | `RoleName.USER`, `ADMIN`, `SUPER_ADMIN` | 코드/DB 정합, 정책 불일치 |
| `users.status` | `ACTIVE`, `SUSPENDED`, `DELETED` | `UserStatus` 동일 | KEEP |
| `event.status` | `PLANNED`, `ONGOING`, `ENDED`, `CANCELLED` | `EventStatus` 동일 | KEEP |
| `event_apply.status` | `APPLIED`, `CANCELLED`, `APPROVED`, `REJECTED` | `RegistrationStatus` 동일 | KEEP |
| `event_program.category` | `CONTEST`, `SESSION`, `EXPERIENCE` | `ProgramCategory` 동일 | KEEP |
| `event_program_apply.status` | `APPLIED`, `WAITING`, `APPROVED`, `REJECTED`, `CANCELLED`, `CHECKED_IN` | `ApplyStatus` 동일 | KEEP |
| `booths.status` | `OPEN`, `CLOSED`, `PAUSED` | `BoothStatus` 동일 | KEEP |
| `galleries.gallery_status` | `PUBLIC`, `PRIVATE`, `BLINDED`, `DELETED` | `GalleryStatus` 동일 | KEEP |
| `reviews.review_status` | `PUBLIC`, `REPORTED`, `BLINDED`, `DELETED` | `ReviewStatus` 동일 | KEEP |
| `notices.status` | `PUBLISHED`, `DRAFT`, `HIDDEN` | `NoticeStatus` 동일 | KEEP |
| `payments.status` | `REQUESTED`, `APPROVED`, `FAILED`, `CANCELLED`, `REFUNDED` | `PaymentStatus` 동일 | KEEP |
| `refunds.status` | `REQUESTED`, `APPROVED`, `REJECTED`, `COMPLETED` | `RefundStatus` 동일 | KEEP |
| `content_reports.status` | `PENDING`, `ACCEPTED`, `REJECTED` | `ReportStatus` 동일 | KEEP |

## 프론트 판단용 요약

- 페이지와 직접 연결될 가능성이 높은 CRUD/조회성 API는 대부분 `KEEP`이다.
- 즉시 정리 후보는 테스트/호환/중복 경로다.
- 운영 보조형 API는 `HOLD`로 남기고 프론트 삭제 판단에서 별도 검토하는 것이 안전하다.
## 현재 정리 메모

- 인증, 게시글, 결제, AI 연동은 최신 RDS 정합성을 기준으로 유지한다.
- 챗봇은 사용자용과 관리자용을 분리해 운영한다.
- 관리자 전용 기능은 `/api/admin/**` 하위 원칙을 우선한다.
