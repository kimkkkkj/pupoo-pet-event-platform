// file: src/main/java/com/popups/pupoo/notification/domain/enums/NotificationType.java
package com.popups.pupoo.notification.domain.enums;

/**
 * 알림 타입
 *
 * DB(v1.0) ENUM(notification.type)과 1:1로 정합성을 유지한다.
 */
public enum NotificationType {
    EVENT,
    NOTICE,
    PAYMENT,
    APPLY,
    SYSTEM
}
