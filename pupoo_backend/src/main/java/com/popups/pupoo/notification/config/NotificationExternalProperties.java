// file: src/main/java/com/popups/pupoo/notification/config/NotificationExternalProperties.java
package com.popups.pupoo.notification.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 외부 알림 채널 연동 설정
 *
 * 로컬(local/dev): 더미/NO-OP로 동작
 * 클라우드(cloud): 실제 연동 endpoint/key를 주입하면 실발송
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "notification.external")
public class NotificationExternalProperties {

    /**
     * 이메일 발송 HTTP endpoint
     * - 예: SendGrid/SES Proxy/사내 알림 게이트웨이
     */
    private String emailEndpoint;

    /**
     * SMS 발송 HTTP endpoint
     */
    private String smsEndpoint;

    /**
     * 외부 연동 API Key (선택)
     */
    private String apiKey;
}
