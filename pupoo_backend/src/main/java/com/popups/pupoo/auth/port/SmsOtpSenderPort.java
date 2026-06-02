package com.popups.pupoo.auth.port;

// 기능: 인증 도메인에서 SMS OTP 발송 구현을 추상화한다.
// 설명: 서비스는 수신 번호와 메시지만 전달하고 실제 발송 방식은 어댑터가 담당한다.
// 흐름: 인증 서비스가 포트를 호출하면 provider에 맞는 구현체가 외부 발송을 수행한다.
public interface SmsOtpSenderPort {

    void sendOtp(String phone, String message);
}
