// file: src/main/java/com/popups/pupoo/notification/infrastructure/InAppNotificationSender.java
package com.popups.pupoo.notification.infrastructure;

import com.popups.pupoo.notification.domain.enums.NotificationChannel;
import com.popups.pupoo.notification.domain.enums.NotificationType;
import com.popups.pupoo.notification.domain.enums.SenderType;
import com.popups.pupoo.notification.domain.model.Notification;
import com.popups.pupoo.notification.domain.model.NotificationSend;
import com.popups.pupoo.notification.persistence.NotificationRepository;
import com.popups.pupoo.notification.persistence.NotificationSendRepository;
import com.popups.pupoo.notification.port.NotificationSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 로컬/기본 발송 구현체
 *
 * v1.0 정책
 * - APP: 실제 수신은 inbox insert로 완료되므로, send 테이블에 로그만 남긴다.
 * - EMAIL/SMS: 로컬에서는 실제 외부 발송 대신 로그 + send 테이블 기록으로 대체한다.
 * - 클라우드 배포 후 실제 발송이 필요하면, 아래 주석 처리된 연동 코드를 활성화한다.
 */
@Component
public class InAppNotificationSender implements NotificationSender {

    private static final Logger log = LoggerFactory.getLogger(InAppNotificationSender.class);

    // 시스템 발송자(운영 정책): seed에서 생성되는 admin/user 계정 중 1번을 기본으로 사용
    private static final Long SYSTEM_SENDER_ID = 1L;

    private final NotificationRepository notificationRepository;
    private final NotificationSendRepository notificationSendRepository;

    public InAppNotificationSender(NotificationRepository notificationRepository,
                                  NotificationSendRepository notificationSendRepository) {
        this.notificationRepository = notificationRepository;
        this.notificationSendRepository = notificationSendRepository;
    }

    @Override
    @Transactional
    public void send(SendCommand command) {
        if (command == null || command.getNotificationId() == null) {
            return;
        }

        Notification notification = notificationRepository.findById(command.getNotificationId())
                .orElse(null);

        if (notification == null) {
            return;
        }

        // receiverUserId는 v1.0에서는 inbox가 이미 수신자별로 존재하므로, send 로그는 알림 단위로만 기록한다.
        notificationSendRepository.save(
                NotificationSend.create(notification,
                        command.getSenderId() == null ? SYSTEM_SENDER_ID : command.getSenderId(),
                        command.getSenderType() == null ? SenderType.SYSTEM : command.getSenderType(),
                        command.getChannel() == null ? NotificationChannel.APP : command.getChannel())
        );
    }

    @Override
    @Transactional
    public void sendEmail(List<String> targetEmails, String subject, String body) {
        if (targetEmails == null || targetEmails.isEmpty()) {
            return;
        }

        // 로컬: 로그
        log.info("[EMAIL][LOCAL] to={}, subject={}, bodyLength={}", targetEmails, subject, body == null ? 0 : body.length());

        // 로컬: DB 기록(알림/발신 로그)
        Notification notification = notificationRepository.save(
                Notification.create(NotificationType.SYSTEM,
                        subject == null || subject.isBlank() ? "EMAIL" : subject,
                        body == null ? "" : truncate(body, 255))
        );

        notificationSendRepository.save(NotificationSend.create(notification, SYSTEM_SENDER_ID, SenderType.SYSTEM, NotificationChannel.EMAIL));

        // 클라우드 실발송 예시(주석 해제 후 사용)
        //  - AWS SES / SendGrid / SMTP 등 선택
        //  - 실제 발송 실패 시 재시도/로그 정책 필요
        //
        // for (String to : targetEmails) {
        //     sesClient.sendEmail(request);
        // }
    }

    @Override
    @Transactional
    public void sendSms(List<String> targetPhones, String text) {
        if (targetPhones == null || targetPhones.isEmpty()) {
            return;
        }

        // 로컬: 로그
        log.info("[SMS][LOCAL] to={}, textLength={}", targetPhones, text == null ? 0 : text.length());

        // 로컬: DB 기록(알림/발신 로그)
        Notification notification = notificationRepository.save(
                Notification.create(NotificationType.SYSTEM,
                        "SMS",
                        text == null ? "" : truncate(text, 255))
        );

        notificationSendRepository.save(NotificationSend.create(notification, SYSTEM_SENDER_ID, SenderType.SYSTEM, NotificationChannel.SMS));

        // 클라우드 실발송 예시(주석 해제 후 사용)
        //  - NCP SENS / NHN / CoolSMS 등 선택
        //
        // for (String to : targetPhones) {
        //     sensClient.send(to, text);
        // }
    }

    private String truncate(String s, int max) {
        if (s == null) {
            return null;
        }
        if (s.length() <= max) {
            return s;
        }
        return s.substring(0, max);
    }
}
