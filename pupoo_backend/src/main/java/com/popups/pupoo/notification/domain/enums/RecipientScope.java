// file: src/main/java/com/popups/pupoo/notification/domain/enums/RecipientScope.java
package com.popups.pupoo.notification.domain.enums;

/**
 * 알림 발송 대상자 범위
 *
 * DB 우선 정책:
 * - INTEREST_SUBSCRIBERS: event_interest_map + user_interest_subscriptions 기반
 * - EVENT_REGISTRANTS: event_apply(=EventRegistration) 기반
 * - EVENT_PAYERS: payments(status=APPROVED) 기반
 */
public enum RecipientScope {
    INTEREST_SUBSCRIBERS,
    EVENT_REGISTRANTS,
    EVENT_PAYERS
}
