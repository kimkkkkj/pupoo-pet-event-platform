// file: src/main/java/com/popups/pupoo/notification/application/UserActivityNotifier.java
package com.popups.pupoo.notification.application;

import com.popups.pupoo.event.domain.model.Event;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.notification.domain.enums.InboxTargetType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 결제·환불처럼 회원 본인의 활동 결과를 알림으로 알려준다.
 *
 * - 알림은 원래 작업(결제 승인, 환불 등)이 커밋된 뒤에 별도 트랜잭션으로 보낸다.
 *   알림 저장이 실패해도 결제·환불은 되돌리지 않는다.
 * - 알림 실패는 로그만 남긴다.
 */
@Component
public class UserActivityNotifier {

    private static final Logger log = LoggerFactory.getLogger(UserActivityNotifier.class);

    private final NotificationService notificationService;
    private final EventRepository eventRepository;
    private final TransactionTemplate newTransaction;

    public UserActivityNotifier(NotificationService notificationService,
                                EventRepository eventRepository,
                                PlatformTransactionManager transactionManager) {
        this.notificationService = notificationService;
        this.eventRepository = eventRepository;
        this.newTransaction = new TransactionTemplate(transactionManager);
        this.newTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public void paymentApproved(Long userId, Long eventId) {
        String name = eventName(eventId);
        send(userId, "결제가 완료됐어요",
                name + " 참가비 결제가 완료되어 참가가 확정됐어요. 행사 당일 입장 QR로 입장해 주세요.",
                eventId);
    }

    public void refundRequested(Long userId, Long eventId) {
        String name = eventName(eventId);
        send(userId, "환불 신청이 접수됐어요",
                name + " 환불 신청을 받았어요. 관리자 확인 후 결과를 알려드릴게요.",
                eventId);
    }

    public void refundCompleted(Long userId, Long eventId) {
        String name = eventName(eventId);
        send(userId, "환불이 완료됐어요",
                name + " 참가비가 결제하신 수단으로 환불됐어요. 참가 신청도 함께 취소됐어요.",
                eventId);
    }

    public void refundRejected(Long userId, Long eventId) {
        String name = eventName(eventId);
        send(userId, "환불 신청이 거절됐어요",
                name + " 환불 신청이 거절됐어요. 자세한 내용은 고객센터로 문의해 주세요.",
                eventId);
    }

    private String eventName(Long eventId) {
        if (eventId == null) return "행사";
        return eventRepository.findById(eventId)
                .map(Event::getEventName)
                .filter(name -> name != null && !name.isBlank())
                .orElse("행사");
    }

    private void send(Long userId, String title, String content, Long eventId) {
        if (userId == null) return;
        InboxTargetType targetType = eventId == null ? InboxTargetType.NOTICE : InboxTargetType.EVENT;
        Runnable task = () -> {
            try {
                newTransaction.executeWithoutResult(status ->
                        notificationService.publishUserNoticeNotification(userId, title, content, targetType, eventId));
            } catch (RuntimeException e) {
                log.warn("User activity notification failed: userId={}, title={}", userId, title, e);
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }
}
