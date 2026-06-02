// file: src/main/java/com/popups/pupoo/program/apply/domain/enums/ApplyStatus.java
package com.popups.pupoo.program.apply.domain.enums;

public enum ApplyStatus {
    APPLIED,
    WAITING,
    APPROVED,
    REJECTED,
    CANCELLED,

    /**
     * 참여 확정(티켓 사용 완료)
     * - 다회 참여를 허용하기 위해 CHECKED_IN 상태는 "비활성"로 취급하여 재신청이 가능하도록 한다.
     */
    CHECKED_IN
}
