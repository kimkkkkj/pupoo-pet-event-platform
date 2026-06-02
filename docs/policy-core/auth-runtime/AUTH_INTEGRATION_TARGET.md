# AUTH_INTEGRATION_TARGET.md

## 1. 현재 인증 구조 요약

### backend

- 진입 API
  - `/api/auth/login`
  - `/api/auth/refresh`
  - `/api/auth/logout`
  - `/api/auth/signup/start`
  - `/api/auth/signup/verify-otp`
  - `/api/auth/signup/email/request`
  - `/api/auth/signup/email/confirm`
  - `/api/auth/signup/complete`
  - `/api/auth/password-reset/request`
  - `/api/auth/password-reset/verify-code`
  - `/api/auth/password-reset/confirm`
- 주요 서비스
  - `AuthService`
  - `SignupSessionService`
  - `PasswordResetService`
  - `PhoneVerificationService`
- 보안 기준
  - JWT + refresh cookie
  - `SecurityConfig.java`
  - `auth.refresh.cookie.*` 설정
- 발송/인증 결합 상태
  - 회원가입 OTP 발송과 이메일 인증 발송이 서비스 로직 안에 직접 녹아 있음
  - `SignupSessionService`가 notification sender를 통해 email 발송 수행
  - phone OTP는 service 내부에서 코드 생성과 발송 흐름을 직접 제어

### frontend

- 가입/인증 화면
  - `JoinNormal.jsx`
  - `KakaoJoin.jsx`
  - `KakaoOtp.jsx`
- 비밀번호 재설정
  - `FindPassword.jsx`
  - `ResetPassword.jsx`
- 이메일 변경
  - `MypageProfileEdit.jsx`
- API client
  - `pages/site/auth/api/authApi.js`
  - `features/auth/api/authApi.js`

## 2. 목표 인증 구조 요약

- 인증 도메인 규칙과 외부 발송 수단을 분리한다.
- 도메인 서비스는 다음만 책임진다.
  - 코드/토큰 발급 규칙
  - 만료/재시도/쿨다운/잠금 규칙
  - 검증 성공/실패 상태 전이
- 외부 발송은 adapter가 책임진다.
  - 이메일: AWS SES adapter
  - SMS OTP: AWS 기반 SMS adapter
- 프론트는 발송 수단을 알지 못하고, 인증 상태 전이만 처리한다.

## 3. 이메일 인증 목표 구조

### 목표

- AWS SES 기반 이메일 인증 발송 도입
- 도메인 규칙은 SES에 종속되지 않음

### 권장 포트/어댑터

- Port 후보
  - `EmailVerificationSenderPort`
  - `EmailTemplateRendererPort`
- Adapter 후보
  - `AwsSesEmailVerificationSender`
  - `ConsoleEmailVerificationSender` 또는 `DevEmailVerificationSender`

### 영향 받는 backend 파일/영역

- `SignupSessionService.java`
- `PasswordResetService.java`
- `AuthController.java`
- `application.properties`
- `notification` 또는 `auth.infrastructure` 하위 새 adapter 계층

### 영향 받는 frontend 흐름

- `JoinNormal.jsx` 이메일 인증 단계
- `FindPassword.jsx` 이메일 기반 재설정 흐름
- `MypageProfileEdit.jsx` 이메일 변경 인증

## 4. SMS OTP 목표 구조

### 목표

- AWS 기반 SMS 발송으로 OTP를 전환
- 인증 세션과 외부 SMS 발송을 분리

### 권장 포트/어댑터

- Port 후보
  - `SmsOtpSenderPort`
  - `OtpCodeGeneratorPort` 또는 `VerificationCodeGeneratorPort`
- Adapter 후보
  - `AwsSmsOtpSender`
  - `DevSmsOtpSender`

### 영향 받는 backend 파일/영역

- `SignupSessionService.java`
- `PhoneVerificationService.java`
- OTP 관련 repository/domain model
- `application.properties`
- `auth.infrastructure.sms` 또는 `notification.infrastructure.sms`

### 영향 받는 frontend 흐름

- `JoinNormal.jsx` 휴대폰 OTP 입력 흐름
- `KakaoOtp.jsx`
- 향후 실제 SMS 기반 인증 화면 전체
- `QRCheckin.jsx`의 `sms-test` endpoint 정책 재정의 필요

## 5. Port-Adapter 후보 명칭

### 인증 도메인 포트

- `VerificationCodeGeneratorPort`
- `OtpVerificationPolicyPort` 또는 도메인 내부 정책 객체
- `EmailVerificationSenderPort`
- `SmsOtpSenderPort`
- `VerificationAuditPort`

### 인프라 어댑터

- `AwsSesEmailVerificationSender`
- `AwsSmsOtpSender`
- `DevExposeEmailVerificationSender`
- `DevExposeSmsOtpSender`

## 6. 환경변수/설정값 후보

### 이메일 SES

- `AUTH_EMAIL_PROVIDER=ses`
- `AUTH_EMAIL_FROM_ADDRESS`
- `AUTH_EMAIL_FROM_NAME`
- `AWS_SES_REGION`
- `AWS_SES_CONFIGURATION_SET`
- `AUTH_EMAIL_ENABLED`

### SMS OTP

- `AUTH_SMS_PROVIDER=aws`
- `AWS_SMS_REGION`
- `AWS_SMS_ORIGINATION_ID`
- `AUTH_SMS_ENABLED`
- `AUTH_SMS_SANDBOX_MODE`

### 공통 인증 발송

- `AUTH_VERIFICATION_MODE=dev|prod`
- `AUTH_DEV_EXPOSE_VERIFICATION_CODE`
- `AUTH_OTP_TTL_MINUTES`
- `AUTH_OTP_COOLDOWN_SECONDS`
- `AUTH_OTP_MAX_FAIL_COUNT`
- `AUTH_OTP_BLOCK_MINUTES`

## 7. 유지해야 할 것 / 교체해야 할 것

### 유지해야 할 것

- JWT + refresh cookie 구조
- `SecurityConfig.java`의 권한 분리 기준
- signup/password-reset의 도메인 상태 전이
- 해시 저장 방식과 TTL/쿨다운/실패 횟수 규칙
- 프론트의 가입/재설정 단계형 UX

### 교체해야 할 것

- 서비스 내부에 섞인 발송 구현 의존
- dev expose 코드와 실제 발송 정책의 혼재
- SMS/이메일 발송 구현과 인증 도메인의 결합
- `sms-test`를 정책 없이 둔 상태

## 8. 다음 단계에서 해야 할 설계 작업

1. 인증 도메인 서비스에서 발송 인터페이스를 명시적으로 분리한다.
2. dev/prod 발송 전략을 profile 또는 provider 설정으로 분기한다.
3. SES/SMS adapter는 인증 도메인을 모른 채 메시지 발송만 담당하게 한다.
4. frontend는 발송 채널명이 아니라 인증 단계 상태만 소비하도록 계약을 유지한다.
