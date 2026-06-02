# 관리자 운영 지표 API 안내

## 목적

- 로그인 실패율, 결제 단계 실패율, AI fallback 비율, 알림 SSE 연결 상태를 관리자 권한으로 바로 확인한다.
- 현재 응답 범위는 **단일 백엔드 파드** 기준이다.
- 롤링 배포나 파드 재기동 이후에는 카운터가 다시 시작된다.

## 엔드포인트

- `GET /api/admin/operations/metrics`

## 응답 범위

- `auth.passwordLogin`
  - 이메일/비밀번호 로그인 성공/실패 수
- `auth.socialLogin`
  - 소셜 로그인으로 기존 회원 세션이 발급된 수
- `auth.signupLogin`
  - 회원가입 완료 직후 자동 로그인 수
- `auth.refresh`
  - refresh 재발급 성공/실패 수
- `payment.ready`
  - KakaoPay ready 성공/실패 수
- `payment.approve`
  - KakaoPay approve 성공/실패 수
- `payment.cancel`
  - KakaoPay cancel 성공/실패 수
- `ai.eventPrediction`
  - 이벤트 혼잡도 예측의 모델 응답 수와 fallback 수
- `ai.programPrediction`
  - 프로그램 혼잡도 예측의 모델 응답 수와 fallback 수
- `notificationSse`
  - 신규 연결 수
  - 재연결 수
  - 완료/타임아웃/에러/전송 실패 종료 수
  - 현재 활성 연결 수

## 해석 주의사항

- `scope=pod`는 현재 응답이 클러스터 전체 합계가 아니라 **응답한 파드 하나의 런타임 값**이라는 뜻이다.
- 운영 대시보드에서 클러스터 전체 합계를 보려면 향후 Prometheus/Grafana 또는 중앙 집계 저장소가 필요하다.
- 결제 단계 카운터는 실제 PG 호출을 수행한 시점만 집계한다. 입력값 검증 실패나 중복 결제 차단은 포함하지 않는다.
