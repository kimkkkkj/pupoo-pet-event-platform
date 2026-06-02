package com.popups.pupoo.auth.port;

import java.time.LocalDateTime;

// 기능: 인증 도메인에서 사용하는 이메일 발송 구현을 추상화한다.
// 설명: 회원가입 코드, 비밀번호 재설정, 계정 이메일 인증 링크, 이메일 변경 인증까지 auth 전용 포트로 묶는다.
// 흐름: 서비스는 어떤 인증 메일을 보낼지 결정하고, 실제 제목/본문/발송 구현은 어댑터가 담당한다.
public interface EmailVerificationSenderPort {

    void sendVerificationEmail(String email, String code);

    void sendPasswordResetEmail(String email, String token);

    void sendAccountVerificationEmail(String email, String token);

    void sendEmailChangeVerificationEmail(String email, String token, LocalDateTime expiresAt);
}
