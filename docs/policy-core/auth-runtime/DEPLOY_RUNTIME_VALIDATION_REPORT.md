# DEPLOY RUNTIME VALIDATION REPORT

작성일: 2026-03-19
검증 대상: PUPOO 운영 백엔드 인증 런타임
검증 기준 시점: 2026-03-19 16시대 KST

## 1. 배포 결과

- 신규 배포 실행 여부: 미실행
- 현재 운영 배포 상태: 정상 기동 중
- 현재 운영 백엔드 이미지: `8583b8e2bef5bca01bdf26517075479416e38989`
- 최근 운영 배포 워크플로우: GitHub Actions `Deploy Main` 성공
- 최근 운영 배포 시각: 2026-03-18 09:23:08 UTC

판단:
- 현재 운영 배포는 살아 있으나, 이번 인증 AWS runtime 주입 관련 로컬 변경은 아직 `main` 배포 파이프라인에 반영되지 않았다.
- 이유:
  - 운영 배포 workflow는 `main` push 또는 수동 실행 기준이다.
  - 현재 작업 브랜치에는 미커밋 변경이 남아 있고 인증 외 변경도 다수 섞여 있다.
  - 따라서 이번 turn에서는 신규 운영 배포를 강행하지 않고, 현재 운영 배포본 기준 실제 동작과 실패 원인을 검증했다.

## 2. 런타임 주입 확인 결과

확인 경로:
- `.github/workflows/deploy.yml`
- `k8s/base/backend-secret.example.yaml`
- `kubectl get/describe secret, pod, deployment`
- 현재 운영 pod 환경변수

결과:
- `AUTH_EMAIL_PROVIDER`: 운영 secret 미존재
- `AUTH_SMS_PROVIDER`: 운영 secret 미존재
- `AWS_REGION`: pod에는 존재
- `AWS_SMS_REGION`: 운영 secret 미존재
- `AWS_ACCESS_KEY_ID`: 운영 secret 미존재
- `AWS_SECRET_ACCESS_KEY`: 운영 secret 미존재
- `AWS_SES_FROM_ADDRESS`: 운영 secret 미존재

세부 판단:
- 현재 운영 `pupoo-backend-secret`에는 인증 AWS 발송용 키들이 없다.
- pod에는 IRSA/EKS 기본 AWS 환경만 있고, 인증 발송 전용 key 주입은 없다.
- 로컬의 `deploy.yml` 변경분에는 위 키들을 `pupoo-backend-secret`에 patch 하는 단계가 추가돼 있으나, 이 변경은 아직 운영 배포에 반영되지 않았다.

결론:
- 현재 운영 런타임은 `aws-ses`/`aws-sns` 실발송 검증이 가능한 상태가 아니다.
- 이 항목의 1차 분류는 `환경변수 주입 문제`다.

## 3. Pod 상태

- deployment `pupoo-backend`: `Available=True`
- pod 수: 2
- readiness/liveness: 정상
- restart count: 0
- startup 예외: 인증 AWS client bean 실패 로그는 확인되지 않음

추가 관찰:
- `SesV2Client`, `SnsClient` 생성 실패 로그는 없었다.
- 현재 운영 secret에 auth provider 관련 키가 없으므로, 조건부 AWS client 생성 경로 자체가 활성화되지 않은 것으로 판단된다.

## 4. 회원가입 테스트 결과

테스트 순서:
- `POST /api/auth/signup/start`

실제 결과:
- HTTP status: `400`
- ApiResponse 형식: 정상
- 에러 코드/메시지: `C4000 / DATA_INTEGRITY_VIOLATION`

로그 확인:
- `signup_sessions` insert 자체는 수행됨
- 직후 `[SMS][LOCAL]` 로그 발생
- 이어서 `notification_send.sender_id -> users.user_id` FK 오류 발생
- 결과적으로 전체 트랜잭션 롤백

DB 반영:
- `signup_sessions`: 0건
- `email_verification_token`: 0건
- `phone_verification_token`: 0건

판단:
- 현재 운영본의 회원가입 시작 실패는 AWS SNS 미연동 때문이 아니라, dev/local SMS helper 경로에서 내부 notification 저장 중 FK 오류가 발생해 트랜잭션이 롤백되는 문제다.
- 따라서 아래 단계는 진행 불가:
  - `POST /api/auth/signup/verify-otp`
  - `POST /api/auth/signup/email/request`
  - `POST /api/auth/signup/email/confirm`
  - `POST /api/auth/signup/complete`

분류:
- 1차: `코드 문제`
- 2차: `DB 반영 문제`

## 5. 비밀번호 재설정 테스트 결과

실제 수행:
- `POST /api/auth/password-reset/request` 실패 경로 확인

결과:
- HTTP status: `400`
- ApiResponse 형식: 정상
- 메시지: 일치하는 회원 정보를 찾지 못했습니다.

해석:
- 공개 엔드포인트 접근 자체는 가능하다.
- 실패 응답 형식은 정상이다.

미수행 항목:
- `POST /api/auth/password-reset/request` 성공 경로
- `POST /api/auth/password-reset/verify-code`
- `POST /api/auth/password-reset/confirm`

미수행 사유:
- 운영 영향 없는 전용 테스트 계정을 확인하지 못했다.
- 성공 경로를 실제 계정으로 수행하면 비밀번호 변경과 세션 무효화가 발생할 수 있어 보수적으로 중단했다.

분류:
- 현재까지 확인 가능한 범위에서는 `실패 응답 정상`
- 성공 경로는 `운영 테스트 계정 부재`로 검증 보류

## 6. 이메일 변경 테스트 결과

수행 여부:
- 미수행

사유:
- 로그인 가능한 전용 테스트 계정을 확보하지 못했다.
- 운영 계정 대상으로 이메일 변경 request/confirm을 수행하면 실제 계정 정보가 바뀔 수 있어 수행하지 않았다.

검증 불가 항목:
- request 성공만으로 이메일이 바뀌지 않는지
- confirm 성공 후에만 반영되는지
- `refreshMe` 기준 사용자 정보 갱신 여부

분류:
- `운영 테스트 계정 부재`

## 7. SES 결과

결론:
- 실제 SES 발송 검증 불가

근거:
- 운영 secret/pod에 `AUTH_EMAIL_PROVIDER`, `AWS_SES_FROM_ADDRESS`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`가 없다.
- 현재 운영 런타임은 auth 이메일 실발송 경로가 활성화되지 않은 상태다.
- 따라서 아래 원인들은 아직 실제로 분리 검증하지 못했다.
  - SES sandbox
  - sender identity 미검증
  - region mismatch
  - 권한 문제
  - provider 설정 문제

현재 1차 판정:
- `환경변수 주입 문제`가 선행 원인이다.

## 8. SNS 결과

결론:
- 실제 SNS 발송 검증 불가

근거:
- 운영 secret/pod에 `AUTH_SMS_PROVIDER`, `AWS_SMS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`가 없다.
- 현재 운영 회원가입 시작은 `SMS][LOCAL]` helper 경로를 타고 있으며, 그 내부에서 FK 오류로 롤백된다.

현재 1차 판정:
- `코드 문제`와 `환경변수 주입 문제`가 동시에 존재

세부:
- 실발송 미진입
- sandbox / sender id / origination number / region mismatch / IAM 권한 문제는 아직 도달 전 단계라 판정 보류

## 9. 실패 원인 분류

### 1. 코드 문제

- 운영 회원가입 시작 시 dev/local SMS helper가 내부 `notification_send` 기록을 남기다가 `sender_id=1` FK 오류로 트랜잭션을 롤백한다.
- 결과적으로 `signup/start`가 성공하지 못해 전체 회원가입 인증 흐름이 막힌다.

### 2. 환경변수 주입 문제

- 운영 secret/pod에 auth AWS 발송용 키가 누락돼 있다.
- 로컬 `deploy.yml`에는 관련 secret patch가 추가돼 있으나 아직 운영 배포 이력에는 반영되지 않았다.

### 3. AWS 권한 문제

- 현재 단계에서는 미판정
- 이유: 실발송 클라이언트 경로에 진입하지 못함

### 4. SES 설정 문제

- 현재 단계에서는 미판정
- 이유: provider/env 미주입으로 SES 경로 미진입

### 5. SNS sandbox / 번호 정책 문제

- 현재 단계에서는 미판정
- 이유: aws-sns 경로 미진입

### 6. DB 반영 문제

- `signup/start` 호출 직후 `signup_sessions`가 남지 않는다.
- 원인은 DB 연결 불능이 아니라, SMS local helper 내부 FK 예외로 인한 롤백이다.

### 7. 프론트 연동 문제

- 이번 검증 범위에서는 미판정
- 백엔드 단독 호출 기준에서도 동일 실패가 재현된다.

## 10. 즉시 수정 필요 항목

- `main` 배포 대상에 인증 AWS runtime secret patch 변경을 반영하고 운영 배포를 다시 수행할 것
- dev/local SMS helper가 `notification_send` FK에 막히지 않도록 최소 수정 또는 우회가 필요함
- 운영용 인증 검증 전용 테스트 계정 또는 별도 검증 환경을 마련할 것

## 11. 후순위 개선 항목

- 운영 검증 전 체크리스트를 workflow 이전 단계에 문서화
- auth provider가 `dev`로 떨어질 때 경고 로그를 명확히 남기기
- `SYSTEM_SENDER_ID` 하드코딩 의존 제거 또는 존재 보장 검증 추가
- 비밀번호 재설정/이메일 변경의 운영 검증용 안전 계정 정책 마련

## 12. 배포 전 점검 체크리스트

- 인증 관련 변경이 `main` 또는 실제 배포 대상 ref에 정리돼 있는지 확인
- `deploy.yml`의 secret patch 단계가 운영 배포 ref에 포함돼 있는지 확인
- `pupoo-backend-secret`에 auth AWS 키가 생성되는지 확인
- pod env에 auth provider/AWS key가 존재하는지 확인
- `aws-ses`/`aws-sns` provider 활성화 후 startup 예외가 없는지 확인
- 운영 영향 없는 테스트 계정으로 signup/password reset/email change를 재검증할 것

