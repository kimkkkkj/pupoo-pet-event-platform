// file: src/main/java/com/popups/pupoo/program/domain/enums/ProgramStatus.java
package com.popups.pupoo.program.domain.enums;

/**
 * 프로그램 운영 상태.
 *
 * 현재 event_program 테이블에는 status 컬럼이 없고,
 * Program 엔티티는 startAt/endAt 기반으로 상태를 계산한다(isOngoing/isUpcoming/isEnded).
 *
 * 관리자가 프로그램을 숨기거나 임시 중단하는 요구가 생길 경우를 대비해 enum만 준비해둔다.
 */
public enum ProgramStatus {
    ACTIVE,
    PAUSED,
    DELETED
}
