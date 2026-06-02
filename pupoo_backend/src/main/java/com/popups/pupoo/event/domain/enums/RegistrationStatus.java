// file: src/main/java/com/popups/pupoo/event/domain/enums/RegistrationStatus.java
package com.popups.pupoo.event.domain.enums;

/**
 * v2.5 event_apply.status ENUM 매핑
 * - DB: ENUM('APPLIED','CANCELLED','APPROVED','REJECTED')
 *
 *  주의: CANCELLED 철자(LL)로 통일
 */
public enum RegistrationStatus {
    APPLIED,
    CANCELLED,
    APPROVED,
    REJECTED
}
