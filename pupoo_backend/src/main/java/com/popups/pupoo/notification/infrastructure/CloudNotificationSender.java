// file: src/main/java/com/popups/pupoo/notification/infrastructure/CloudNotificationSender.java
package com.popups.pupoo.notification.infrastructure;

import com.popups.pupoo.notification.config.NotificationExternalProperties;
import com.popups.pupoo.notification.port.NotificationSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

/**
 * 클라우드 환경 전용 NotificationSender
 *
 * 사용자 결정 정책:
 * - 로컬(local/dev)에서는 외부 발송을 하지 않는다(더미).
 * - cloud 프로필에서는 endpoint가 설정되어 있으면 이메일/SMS 실발송을 수행한다.
 *
 * 주의:
 * - 본 구현은 특정 벤더 SDK에 종속되지 않도록 HTTP endpoint 방식으로 구현했다.
 * - 실제 운영에서는 사내 게이트웨이(또는 SendGrid/SES/NCP SENS Proxy 등)로 연결하면 된다.
 */
@Component
@Primary
@Profile("cloud")
public class CloudNotificationSender implements NotificationSender {

    private static final Logger log = LoggerFactory.getLogger(CloudNotificationSender.class);

    private final NotificationExternalProperties props;
    private final RestClient restClient;

    public CloudNotificationSender(NotificationExternalProperties props) {
        this.props = props;
        this.restClient = RestClient.builder().build();
    }

    @Override
    public void send(SendCommand command) {
        // 현재 설계에서 APP(inbox 적재)은 DB 작업으로 완료된다.
        // PUSH는 추후 확장한다.
    }

    @Override
    public void sendEmail(List<String> targetEmails, String subject, String body) {
        if (targetEmails == null || targetEmails.isEmpty()) return;

        if (props.getEmailEndpoint() == null || props.getEmailEndpoint().isBlank()) {
            log.warn("[EMAIL][SKIP] emailEndpoint is not configured. toCount={}", targetEmails.size());
            return;
        }

        EmailPayload payload = new EmailPayload(targetEmails, subject, body);

        try {
            restClient.post()
                    .uri(props.getEmailEndpoint())
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-API-KEY", props.getApiKey() == null ? "" : props.getApiKey())
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

            log.info("[EMAIL][SENT] toCount={}, subjectLength={}", targetEmails.size(), subject == null ? 0 : subject.length());
        } catch (Exception e) {
            log.error("[EMAIL][FAILED] toCount={} reason={}", targetEmails.size(), e.getMessage(), e);
        }
    }

    @Override
    public void sendSms(List<String> targetPhones, String text) {
        if (targetPhones == null || targetPhones.isEmpty()) return;

        if (props.getSmsEndpoint() == null || props.getSmsEndpoint().isBlank()) {
            log.warn("[SMS][SKIP] smsEndpoint is not configured. toCount={}", targetPhones.size());
            return;
        }

        SmsPayload payload = new SmsPayload(targetPhones, text);

        try {
            restClient.post()
                    .uri(props.getSmsEndpoint())
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-API-KEY", props.getApiKey() == null ? "" : props.getApiKey())
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

            log.info("[SMS][SENT] toCount={}, textLength={}", targetPhones.size(), text == null ? 0 : text.length());
        } catch (Exception e) {
            log.error("[SMS][FAILED] toCount={} reason={}", targetPhones.size(), e.getMessage(), e);
        }
    }

    private record EmailPayload(List<String> to, String subject, String body) {
    }

    private record SmsPayload(List<String> to, String text) {
    }
}
