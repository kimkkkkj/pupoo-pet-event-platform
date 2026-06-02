// file: src/main/java/com/popups/pupoo/notification/port/NotificationSender.java
package com.popups.pupoo.notification.port;

import com.popups.pupoo.notification.domain.enums.NotificationChannel;
import com.popups.pupoo.notification.domain.enums.SenderType;
import lombok.Getter;

import java.util.List;

/**
 * 알림 발송 Port
 *
 * v1.0 정책
 * - APP: inbox 적재로 수신 완료(실시간 push는 추후)
 * - EMAIL/SMS: 로컬에서는 로그/DB로 대체, 클라우드에서는 실제 연동 코드를 활성화한다.
 */
public interface NotificationSender {

    void send(SendCommand command);

    /**
     * 이메일 발송
     *
     * 로컬: 로그/DB
     * 클라우드: 실제 발송 코드를 활성화(주석 해제)해서 사용
     */
    void sendEmail(List<String> targetEmails, String subject, String body);

    /**
     * SMS 발송
     *
     * 로컬: 로그/DB
     * 클라우드: 실제 발송 코드를 활성화(주석 해제)해서 사용
     */
    void sendSms(List<String> targetPhones, String text);

    @Getter
    class SendCommand {
        private final Long notificationId;
        private final Long receiverUserId;
        private final Long senderId;
        private final SenderType senderType;
        private final NotificationChannel channel;

        public SendCommand(Long notificationId,
                           Long receiverUserId,
                           Long senderId,
                           SenderType senderType,
                           NotificationChannel channel) {
            this.notificationId = notificationId;
            this.receiverUserId = receiverUserId;
            this.senderId = senderId;
            this.senderType = senderType;
            this.channel = channel;
        }
    }
}
