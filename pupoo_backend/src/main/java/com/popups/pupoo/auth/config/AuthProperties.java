// file: src/main/java/com/popups/pupoo/auth/config/AuthProperties.java
package com.popups.pupoo.auth.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 기능: auth.* 설정을 인증 모듈 전용 프로퍼티 객체로 바인딩한다.
 * 설명: JWT, 토큰 TTL, 쿠키, 외부 발송 provider 선택값을 한 곳에서 관리한다.
 * 흐름: application.properties의 auth.* 값을 읽어 서비스와 config 계층에서 참조한다.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "auth")
public class AuthProperties {

    private Jwt jwt = new Jwt();
    private Access access = new Access();
    private Refresh refresh = new Refresh();
    private Email email = new Email();
    private Sms sms = new Sms();

    @Getter
    @Setter
    public static class Jwt {
        private String secret;
        private String issuer;
    }

    @Getter
    @Setter
    public static class Access {
        private long ttlSeconds;
    }

    @Getter
    @Setter
    public static class Refresh {
        private long ttlSeconds;
        private Cookie cookie = new Cookie();

        @Getter
        @Setter
        public static class Cookie {
            private long maxAgeSeconds;
            private boolean secure;
        }
    }

    @Getter
    @Setter
    public static class Email {
        private String provider = "dev";
    }

    @Getter
    @Setter
    public static class Sms {
        private String provider = "dev";
        private boolean enabled = true;
        private int otpExpirySeconds = 300;
        private int resendCooldownSeconds = 60;
        private int maxRequestsPerMinute = 1;
        private int maxRequestsPerDay = 5;
        private int maxVerifyFailures = 5;
    }
}
