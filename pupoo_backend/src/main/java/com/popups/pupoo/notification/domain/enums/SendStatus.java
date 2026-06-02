// file: src/main/java/com/popups/pupoo/notification/domain/enums/SendStatus.java
package com.popups.pupoo.notification.domain.enums;

/**
 * 발송 처리 상태.
 *
 * 현재 notification_send 테이블은 sent_at만 기록하지만,
 * 추후 재시도/실패 로그가 필요해질 수 있어 상태 enum을 준비해둔다.
 */
public enum SendStatus {
    READY,
    SENT,
    FAILED
}
