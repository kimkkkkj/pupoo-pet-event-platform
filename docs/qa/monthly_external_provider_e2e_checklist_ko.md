# 월간 외부 연동 E2E 체크리스트

## Google 로그인

- [ ] `https://www.pupoo.site/auth/login`에서 `Google로 로그인` 버튼을 눌렀을 때 Google 인증 화면으로 이동한다.
- [ ] 기존 가입 계정으로 로그인하면 `https://www.pupoo.site/`로 정상 복귀하고 세션이 유지된다.
- [ ] 로그인 후 다시 진입해도 `pupoo.site`가 아닌 `www.pupoo.site` 기준으로 세션과 콜백이 유지된다.
- [ ] 신규 계정 흐름에서 `https://www.pupoo.site/auth/join/joinselect`의 Google 버튼이 정상 작동한다.
- [ ] 신규 계정 흐름에서 콜백 후 가입 정보가 자연스럽게 채워진다.

## KakaoPay

- [ ] 사용자 계정으로 참가 신청 또는 결제 진입 화면까지 이동한다.
- [ ] `카카오페이로 결제하기` 버튼을 눌렀을 때 KakaoPay 결제 화면으로 이동한다.
- [ ] 승인 완료 후 `https://www.pupoo.site/payment/approve?paymentId=...`로 복귀하고 결제 완료 화면이 정상 표시된다.
- [ ] 사용자 취소 후 `https://www.pupoo.site/payment/cancel?paymentId=...`로 복귀하고 취소 안내가 정상 표시된다.
- [ ] 실패 후 `https://www.pupoo.site/payment/fail?paymentId=...`로 복귀하고 실패 안내가 정상 표시된다.
- [ ] 결제 이력과 신청 상태가 실제 결과와 일치하는지 확인한다.

## 운영 메모

- [ ] 자동 사전점검 리포트에 실패가 없는지 확인한다.
- [ ] 이번 점검에서 생성된 테스트 결제와 임시 데이터가 남아 있지 않은지 확인한다.
- [ ] 확인 결과, 실패 화면 캡처, 후속 조치 여부를 기록한다.
