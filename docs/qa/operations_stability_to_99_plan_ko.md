# 운영 안정도 99 달성 자동화 플랜

## 목표

- 현재 기준 운영 안정도 `91점` 수준을 `99점` 수준까지 끌어올린다.
- 단순 인프라 헬스가 아니라 `핵심 사용자 여정`이 깨지면 자동으로 감지되고, 가능하면 배포 전에 차단되며, 배포 후에도 빠르게 롤백되도록 만든다.
- 사람이 감으로 확인하던 운영 검증을 `배포 게이트`, `정기 synthetic test`, `경보`, `자동 복구`로 전환한다.

## 전제

- 현재 강점
  - EKS, CloudFront, ECR, GitHub Actions 기반 배포 파이프라인이 이미 있다.
  - `provider-preflight.mjs`, 운영 지표 API, 헬스 체크, 배포 자동화가 일부 존재한다.
  - 회원가입 `start/complete` 중복 처리 이슈는 운영에서 재검증까지 끝난 상태다.
- 현재 약점
  - 핵심 사용자 여정이 깨져도 배포 자체는 통과할 수 있다.
  - 운영 안정도 수치가 핵심 여정 품질을 충분히 반영하지 못한다.
  - 회원가입/로그인/결제 성공률이 자동 집계되지 않는다.
  - 배포 후 smoke가 약해서 “배포는 성공했지만 사용자 흐름은 깨진 상태”를 늦게 발견할 수 있다.

## 99의 의미

이 문서에서 `99`는 단순히 “에러가 거의 없다”가 아니라 아래를 동시에 만족하는 상태를 뜻한다.

- 핵심 사용자 여정 장애가 `배포 전`에 높은 확률로 차단된다.
- 배포 후 장애가 발생해도 `5분 이내`에 감지된다.
- 감지 후 `10분 이내`에 롤백 또는 우회가 가능하다.
- 운영자가 수동으로 보지 않아도 상태를 알 수 있다.

## 핵심 지표

### 배포 게이트 지표

- 회원가입 시작 smoke 통과율
- 회원가입 완료 smoke 통과율
- 로그인 smoke 통과율
- refresh smoke 통과율
- 결제 ready/approve smoke 통과율

### 운영 SLO 지표

- 최근 1시간 회원가입 시작 성공률
- 최근 1시간 회원가입 완료 성공률
- 최근 1시간 로그인 성공률
- 최근 1시간 refresh 성공률
- 최근 24시간 결제 승인 성공률

### 런타임 품질 지표

- `Unhandled exception` 발생 수
- 5xx 응답 비율
- 배포 후 15분 내 핵심 사용자 여정 실패 여부

## 목표 점수 변화

- 1단계 자동화 완료: `91 -> 94`
- 2단계 자동화 완료: `94 -> 96`
- 3단계 자동화 완료: `96 -> 98`
- 4단계 자동화 완료: `98 -> 99`

## 단계별 플랜

### 1단계: 배포 차단 자동화 `91 -> 94`

기간:

- `1~3일`

목표:

- 핵심 사용자 여정 문제가 있으면 `Deploy Main`이 성공하지 못하게 한다.

할 일:

- `signup/start` production smoke 추가
  - 전화번호 중복
  - 이메일 중복
  - 닉네임 중복
  - 중복 시 `409`와 기대 코드 확인
  - 중복 시 `signup_sessions`가 생성되지 않는지 확인
- `signup/complete` production smoke 추가
  - 중복 전화번호 기준 `409/U4093`
  - 실패 시 `users` 미삽입 확인
- 로그인 smoke 추가
  - 테스트 계정 로그인
  - access token 발급 확인
- refresh smoke 추가
  - refresh cookie 기반 access 재발급 확인
- 이 4개 smoke를 `deploy.yml`의 backend-deploy 뒤에 추가
- smoke 실패 시 workflow 전체 실패 처리

자동화 방식:

- GitHub Actions에서 `kubectl`과 임시 mysql client pod 사용
- 운영 DB에는 실제 사용자 생성이 남지 않도록 `signup_session` 기반 검증 사용
- 테스트 데이터는 이메일 prefix 규칙으로 생성하고, always-cleanup 단계로 삭제

완료 기준:

- 배포 후 핵심 인증 여정 smoke 4종이 모두 자동 실행된다.
- 하나라도 실패하면 `Deploy Main`이 실패 상태가 된다.

### 2단계: 운영 synthetic monitoring `94 -> 96`

기간:

- `3~7일`

목표:

- 배포가 없더라도 운영 중 핵심 흐름이 깨지면 5분 안에 감지한다.

할 일:

- GitHub Actions `schedule` 또는 별도 runner로 5분 간격 synthetic job 실행
- 대상 여정
  - 회원가입 시작 중복 차단
  - 회원가입 완료 중복 차단
  - 로그인
  - refresh
  - `/api/health`
  - `/ai/health`
- 결과를 Slack 또는 Discord webhook으로 알림
- 2회 연속 실패 시 `critical` 알림
- 1회 실패 시 `warning` 알림

자동화 방식:

- smoke 스크립트를 `scripts/`에 독립 파일로 분리
- 결과를 JSON으로 출력
- GitHub Actions summary와 알림 메시지에 최근 실패 원인을 같이 첨부

완료 기준:

- 운영 장애 발생 후 사람이 직접 들어가 보기 전에 알림이 먼저 온다.
- 인증 핵심 흐름 장애를 `5분 이내`에 탐지할 수 있다.

### 3단계: 운영 지표 API 고도화 `96 -> 98`

기간:

- `1~2주`

목표:

- “지금 운영이 좋은지”를 로그가 아니라 숫자로 바로 본다.

할 일:

- 관리자 운영 지표 API 확장
  - `auth.signupStart`
  - `auth.signupComplete`
  - `auth.refresh`
  - `auth.login`
  - `payment.ready`
  - `payment.approve`
- 각 지표에 성공/실패 카운트와 최근 1시간 성공률 추가
- 실패 사유 상위 코드 집계
  - `U4091`
  - `U4092`
  - `U4093`
  - `A4101`
  - `C5000`
- `deploy SHA`, `최근 배포 시각`, `최근 배포 이후 실패 증가 여부` 추가
- `operations_stability_scorecard` 계산에 이 지표를 직접 연결

자동화 방식:

- 백엔드 메모리 카운터가 아니라 중앙 수집형 지표로 이동
  - 가능하면 Prometheus/Grafana 또는 CloudWatch custom metric
- 관리자 화면에서 배포 후 15분, 1시간, 24시간 관점으로 비교 가능하게 구성

완료 기준:

- “운영 안정도”가 감이 아니라 실제 성공률 데이터로 계산된다.
- 핵심 여정별 성공률을 한 화면에서 볼 수 있다.

### 4단계: 자동 롤백 및 보호 장치 `98 -> 99`

기간:

- `1~2주`

목표:

- 핵심 사용자 여정이 깨진 배포가 오래 살아남지 못하게 한다.

할 일:

- 배포 후 smoke 실패 시 자동 롤백
  - backend-deploy 성공 후 smoke 실패
  - 직전 SHA로 `kubectl set image` 자동 복귀
- 최근 10분 내 synthetic 2회 연속 실패 시 자동 롤백 후보 판정
- 롤백 이후 알림에
  - 실패 SHA
  - 복귀 SHA
  - 실패한 여정
  - 대표 오류 코드
  - 최근 로그 요약
  포함
- 프론트도 `CloudFront` 배포 후 핵심 페이지 synthetic 추가
  - 로그인 페이지
  - 회원가입 선택 페이지
  - OAuth callback 페이지
  - 결제 approve/cancel/fail 페이지

자동화 방식:

- GitHub Actions workflow 분기 또는 별도 rollback workflow
- 이전 성공 SHA를 artifact 또는 release metadata로 저장
- 롤백 실행은 사람이 승인 없이도 가능한 기준과, 승인 필요한 기준을 분리

완료 기준:

- 핵심 사용자 여정이 깨진 배포는 자동으로 되돌릴 수 있다.
- 장애 감지부터 롤백까지 `10분 이내`를 목표로 한다.

## 구현 우선순위

### P0

- backend deploy 뒤 `signup/start`, `signup/complete`, `login`, `refresh` smoke 추가
- smoke 실패 시 배포 실패 처리
- smoke 스크립트 공통 cleanup 추가

### P1

- scheduled synthetic monitoring 추가
- Slack/Discord 알림 추가
- 운영 지표 API에 signupStart/signupComplete 성공률 추가

### P2

- 결제 ready/approve synthetic 추가
- 운영 지표 dashboard 연결
- 점수표 자동 계산 스크립트 추가

### P3

- 자동 롤백 추가
- 프론트 핵심 페이지 synthetic 추가
- 월간 외부 연동 점검을 주간 자동 점검으로 승격

## 저장소 기준 작업 항목

### `.github/workflows/deploy.yml`

- backend-deploy 이후 smoke step 추가
- smoke 실패 시 workflow fail
- 향후 rollback job 추가

### `scripts/`

- `auth-journey-smoke.mjs` 또는 `auth-journey-smoke.ps1`
- `payment-smoke.mjs`
- `stability-score-report.mjs`

### `docs/qa/`

- 이 문서를 기준으로 운영 자동화 진행 상황 갱신
- scorecard와 연결

### backend

- 운영 지표 API에 핵심 여정 성공/실패 카운터 추가
- 오류 코드별 집계 추가

## 자동화 완료 후 기대 상태

- 배포 성공 = 핵심 인증 여정 smoke 성공
- 운영 중 장애 발생 = 5분 내 synthetic 감지 + 알림
- 핵심 여정 장애 배포 = 자동 실패 또는 자동 롤백
- 운영 안정도 숫자 = 실측 성공률과 직접 연결

## 2026-03-29 기준 추천 착수 순서

1. `Deploy Main`에 auth smoke 4종 추가
2. smoke 스크립트에서 DB cleanup 표준화
3. 운영 지표 API에 `signupStart`, `signupComplete` 성공률 추가
4. 5분 간격 synthetic + Slack 알림 추가
5. 배포 후 smoke 실패 시 자동 롤백 추가

## 한 줄 결론

`91에서 99로 가는 핵심은, 핵심 사용자 여정을 배포 성공 조건으로 승격하고, 운영에서 5분 내 자동 탐지·10분 내 자동 복구가 가능하게 만드는 것`이다.
