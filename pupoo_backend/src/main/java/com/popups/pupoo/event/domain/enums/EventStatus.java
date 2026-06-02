// file: src/main/java/com/popups/pupoo/event/domain/enums/EventStatus.java
package com.popups.pupoo.event.domain.enums;

/**
 * 행사 상태다.
 * DB `event.status`와 1:1로 매핑되며, 공개 화면에서는 날짜 기준으로 재해석될 수 있다.
 */
public enum EventStatus {
    PLANNED,
    ONGOING,
    ENDED,
    CANCELLED
}
