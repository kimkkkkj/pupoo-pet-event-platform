# API_STATUS_MATRIX

## 기준

- 기준 우선순위: 실DB > 정책서 > 코드
- 상태 정의:
  - `KEEP`: 실DB/정책/구현 정합
  - `HOLD`: 운영 보조 또는 외부 연동 성격
  - `REMOVE`: 테스트성, 호환용 중복, 정책 불일치 경로

## 매트릭스

| 도메인 | Controller | 엔드포인트 묶음 | 사용 Entity / Table | 상태 | 판단 근거 |
|---|---|---|---|---|---|
| Auth | `AuthController` | `POST /signup/start`, `/signup/verify-otp`, `/signup/email/request`, `/signup/email/confirm`, `/signup/complete`, `/oauth/kakao/exchange`, `/oauth/kakao/login`, `/login`, `/password-reset/request`, `/password-reset/verify-code`, `/password-reset/confirm`, `/refresh`, `/logout` | `User`, `SignupSession`, `RefreshToken`, `PasswordResetToken`, `SocialAccount` / `users`, `signup_sessions`, `refresh_token`, `password_reset_token`, `social_account` | KEEP | 실DB + 코드 |
| Auth | `AuthController` | `GET /secure-ping` | 없음 | REMOVE | 코드상 JWT 테스트용 |
| Auth | `AuthVerificationController` | `/api/users/me/email-*`, `/api/users/me/phone-*`, `GET /api/auth/email/verification/confirm` | `User`, `EmailVerificationToken`, `PhoneVerificationToken` / `users`, `email_verification_token`, `phone_verification_token` | KEEP | 실DB + 코드 |
| User | `UserController` | `GET /me`, `GET /check-nickname`, `PATCH /me`, `DELETE /me` | `User` / `users` | KEEP | 실DB + 코드 |
| User | `AdminUserController` | `GET /`, `GET /{id}`, `POST /`, `PATCH /{id}`, `DELETE /{id}` | `User` / `users` | KEEP | 실DB + 코드 |
| Social | `SocialAccountController` | `GET /`, `POST /link`, `DELETE /unlink` | `SocialAccount` / `social_account` | KEEP | 실DB + 코드 |
| Board | `BoardController` | `GET /api/boards`, `POST /api/admin/boards`, `GET /api/admin/boards/{boardId}`, `PUT /api/admin/boards/{boardId}`, `PATCH /api/admin/boards/{boardId}/active` | `Board` / `boards` | KEEP | 실DB + 코드 |
| FAQ | `FaqController`, `AdminFaqController` | `/api/faqs`, `/api/faqs/{postId}`, `/api/admin/faqs` CRUD | `Post`, `Board` / `posts`, `boards` | KEEP | 실DB + 코드 |
| Post | `PostController`, `AdminPostController` | `/api/posts` 목록/상세/신고/등록/수정/삭제/종료, `/api/admin/posts/{postId}/delete` | `Post`, `StoredFile`, `ContentReport` / `posts`, `files`, `content_reports` | KEEP | 실DB + 코드 |
| QnA | `QnaController`, `AdminQnaController` | `/api/qnas` CRUD/종료, `/api/admin/qnas/{qnaId}/answer` | `Post`, `Board` / `posts`, `boards` | KEEP | 실DB + 코드 |
| Review | `ReviewController` | `/api/reviews` CRUD/신고 | `Review`, `ContentReport` / `reviews`, `content_reports` | KEEP | 실DB + 코드 |
| Reply | `ReplyController` | `/api/replies` CRUD/신고 | `PostComment`, `ReviewComment`, `ContentReport` / `post_comments`, `review_comments`, `content_reports` | KEEP | 실DB + 코드 |
| Moderation | `AdminModerationController` | `/api/admin/moderation/posts`, `/reviews`, `/replies` 조회 및 hide/restore/delete | `Post`, `Review`, `PostComment`, `ReviewComment`, `AdminLog` / `posts`, `reviews`, `post_comments`, `review_comments`, `admin_logs` | KEEP | 실DB + 코드 |
| Report | `ReportReasonController`, `AdminReportController` | `/api/report-reasons`, `/api/admin/reports` 조회/처리 | `ContentReport`, `AdminLog` / `content_reports`, `admin_logs` | KEEP | 실DB + 코드 |
| Banned Word | `AdminBannedWordController` | `/api/admin/boards/{boardId}/banned-words`, `/api/admin/banned-words/{bannedWordId}` | `BannedWord`, `BoardFilterPolicy`, `BoardBannedLog` / `board_banned_words`, `board_filter_policy`, `board_banned_logs` | KEEP | 실DB + 코드 |
| Event | `EventController` | `/api/events`, `/api/events/{eventId}`, `/api/events/closed/analytics`, `/api/events/{eventId}/galleries` | `Event`, `Gallery` / `event`, `galleries` | KEEP | 실DB + 코드 |
| Event Admin | `AdminEventOperationController` | `/api/admin/events` CRUD/상태 변경 | `Event` / `event` | KEEP | 실DB + 코드 |
| Event Asset | `AdminEventOperationController` | `POST /api/admin/events/poster/generate`, `POST /api/admin/events/poster/upload` | 오브젝트 스토리지, `event_images` 연관 맥락 | HOLD | 정책서 + 코드 |
| Event Registration | `EventRegistrationController` | `/api/event-registrations`, `/api/users/me/event-registrations` | `EventRegistration` / `event_apply` | KEEP | 실DB + 코드 |
| Program | `ProgramController`, `ProgramAdminController` | `/api/events/{eventId}/programs`, `/api/programs/{programId}`, `/api/admin/programs` CRUD | `Program` / `event_program` | KEEP | 실DB + 코드 |
| Speaker | `ProgramSpeakerController`, `SpeakerController`, `SpeakerAdminController` | `/api/programs/{programId}/speakers`, `/api/speakers`, `/api/admin/speakers` | `Speaker`, `ProgramSpeakerMapping` / `speakers`, `program_speakers` | KEEP | 실DB + 코드 |
| Program Apply | `ProgramApplyController` | `/api/program-applies/my`, `/programs/{programId}/candidates`, `POST /`, `PATCH /{id}/cancel`, `GET /{id}` | `ProgramApply`, `ProgramParticipationStat` / `event_program_apply`, `program_participation_stats` | KEEP | 실DB + 코드 |
| Vote | `ContestVoteController` | `POST /api/programs/{programId}/votes`, `DELETE /api/programs/{programId}/votes`, `GET /result` | `ContestVote` / `contest_votes` | KEEP | 실DB + 코드 |
| Booth | `BoothController` | `/api/events/{eventId}/booths`, `/api/booths/{boothId}` | `Booth`, `BoothWait` / `booths`, `booth_waits` | KEEP | 실DB + 코드 |
| QR | `QrController` | `/api/qr/me`, `/api/qr/me/download`, `/api/me/booth-visits`, `/api/events/{eventId}/me/booth-visits`, `/api/events/{eventId}/booths/{boothId}/me/visits` | `QrCode`, `QrCheckin`, `Booth` / `qr_codes`, `qr_logs`, `booths` | KEEP | 실DB + 코드 |
| QR | `QrController` | `POST /api/qr/me/sms-test` | 없음 | REMOVE | 코드상 시뮬레이션 테스트 |
| QR Admin | `QrAdminController` | `/api/admin/operations/events/{eventId}/booths/{boothId}/qr/check-in`, `/qr/check-out` | `QrCheckin`, `QrCode` / `qr_logs`, `qr_codes` | KEEP | 실DB + 코드 |
| Gallery | `GalleryController`, `GalleryAdminController` | `/api/galleries` 조회/등록/수정/삭제/신고/좋아요, `/api/admin/galleries` 관리 | `Gallery`, `GalleryImage`, `GalleryLike`, `ContentReport` / `galleries`, `gallery_images`, `gallery_likes`, `content_reports` | KEEP | 실DB + 코드 |
| Gallery Asset | `GalleryImageUploadController` | `/api/admin/galleries/images/upload`, `/api/galleries/image/upload` | 스토리지 키 기반 업로드 | KEEP | 정책서 + 코드 |
| Storage | `StorageController` | `/api/files` 업로드/조회/다운로드/삭제, `/api/files/by-post/{postId}` | `StoredFile` / `files` | KEEP | 실DB + 코드 |
| Storage | `StorageController` | `POST /api/files/admin/notice`, `DELETE /api/files/admin/{fileId}` | `StoredFile` / `files` | REMOVE | `/api/admin/**` 정책 위반 + 중복 |
| Storage Admin | `AdminStorageController` | `POST /api/admin/files/notice`, `DELETE /api/admin/files/{fileId}` | `StoredFile` / `files` | KEEP | 실DB + 코드 |
| Notice | `NoticeController`, `AdminNoticeController` | `/api/notices` 조회, `/api/admin/notices` 관리 | `Notice`, `StoredFile` / `notices`, `files` | KEEP | 실DB + 코드 |
| Inquiry | `InquiryController` | `/api/inquiries` 사용자 CRUD, `/api/admin/inquiries` 목록/답변/상태 변경 | `Inquiry`, `InquiryAnswer` / `inquiries`, `inquiry_answers` | KEEP | 실DB + 코드 |
| Interest | `InterestController` | `/api/interests`, `/subscribe`, `/unsubscribe`, `/channels`, `/mysubscriptions` | `Interest`, `UserInterestSubscription` / `interests`, `user_interest_subscriptions` | KEEP | 실DB + 코드 |
| Notification | `NotificationController` | `/api/notifications`, `/unread-count`, `/{inboxId}/click`, `/settings` | `Notification`, `NotificationInbox`, `NotificationSettings` / `notification`, `notification_inbox`, `notification_settings` | KEEP | 실DB + 코드 |
| Notification Admin | `AdminNotificationController` | `/api/admin/notifications` 초안 CRUD/발송, `/event`, `/broadcast` | `admin_notification`, `notification`, `notification_inbox`, `notification_send` | KEEP | 실DB + 코드 |
| Payment | `PaymentController`, `AdminPaymentsController` | 사용자 결제 요청/내역/승인/취소, 관리자 결제 조회/환불 | `Payment`, `PaymentTransaction`, `Refund` / `payments`, `payment_transactions`, `refunds` | KEEP | 실DB + 코드 |
| Refund | `RefundController`, `AdminRefundsController` | 사용자 환불 요청/내역, 관리자 승인/거절/실행 | `Refund`, `Payment` / `refunds`, `payments` | KEEP | 실DB + 코드 |
| Pet | `PetController` | `/api/pets` 등록/내 목록/수정/삭제 | `Pet` / `pet` | KEEP | 실DB + 코드 |
| AI | `AiController`, `AiAdminController` | 행사/프로그램 혼잡도 예측, 프로그램 추천, 관리자 예측 조회 | `ai_event_congestion_timeseries`, `ai_program_congestion_timeseries`, `ai_prediction_logs`, `event_congestion_policy`, `congestions` | KEEP | 실DB + 코드 |
| AI Admin | `AiAdminController` | `POST /api/admin/ai/congestion/backfill` | AI 시계열 테이블 | HOLD | 실DB + 코드, 운영 보조 |
| Analytics | `PublicAnalyticsController`, `AdminAnalyticsController` | 행사 분석, 시간대별 혼잡도, 연간 통계 | `event`, `payments`, `refunds`, `congestions` | KEEP | 실DB + 코드 |
| Dashboard | `DashboardController` | `GET /api/admin/dashboard` | `users`, `event`, `payments`, `refunds`, `inquiries`, `notices` | KEEP | 실DB + 코드 |
| Dashboard | `DashboardController` | `GET /api/admin/dashboard/{id}` | 위 요약 재사용 | REMOVE | 코드상 호환성용 별칭 |
| Dashboard | `AdminDashboardController` | `/api/admin/dashboard/events`, `/programs`, `/program-applies`, `/booths`, `/past-events` | `event`, `event_program`, `event_program_apply`, `booths` | KEEP | 실DB + 코드 |
| Dashboard Realtime | `AdminDashboardRealtimeController`, `PublicDashboardRealtimeController` | `/api/admin/dashboard/realtime/**`, `/api/dashboard/realtime/events/{eventId}/congestions` | `congestions` | KEEP | 실DB + 코드 |
| Audit | `AdminLogAdminController` | `/api/admin/logs` | `AdminLog` / `admin_logs` | KEEP | 실DB + 코드 |
| Chatbot | `ChatbotProxyController` | `POST /api/chatbot/chat` | DB 직접 사용 없음 | HOLD | 코드 근거만 존재 |
| Health | `HealthController` | `GET /api/health` | 없음 | REMOVE | 코드상 local/dev smoke-test |

## 추가 확인 항목

- `SecurityConfig`와 `EndpointPolicy`는 `/api/ping`을 허용하지만 실제 구현 컨트롤러가 없다.
- `SUPER_ADMIN`은 실DB와 코드에 존재하므로 현재 정책 문구와 불일치한다.
