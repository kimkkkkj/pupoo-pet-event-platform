// file: src/main/java/com/popups/pupoo/auth/dto/EmailVerificationRequestResponse.java
package com.popups.pupoo.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailVerificationRequestResponse {

    private LocalDateTime expiresAt;

    /**
     * 개발 환경(Postman 테스트)에서만 사용하는 필드.
 *
 *
 * 운영 환경에서는 절대 노출되면 안 된다.
     *
     *   - 실제 이메일 발송이 연결되기 전, 토큰 확인을 위해 사용한다.-
     *
     */
    private String devToken;
}
