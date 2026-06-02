// file: src/main/java/com/popups/pupoo/program/domain/enums/ProgramType.java
package com.popups.pupoo.program.domain.enums;

/**
 * 프로그램 타입(확장용).
 *
 * 현재는 ProgramCategory(CONTEST/SESSION/EXPERIENCE)를 사용한다.
 * 향후 세부 타입(예: TALK, WORKSHOP 등)이 필요할 때 사용한다.
 */
public enum ProgramType {
    TALK,
    WORKSHOP,
    DEMO,
    ETC
}
