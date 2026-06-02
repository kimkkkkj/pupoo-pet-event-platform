// file: src/main/java/com/popups/pupoo/interest/domain/enums/InterestName.java
package com.popups.pupoo.interest.domain.enums;

/**
 * 관심사 코드(마스터)
 *
 * [정합성 규칙]
 * - DB interests.interest_name ENUM 값과 1:1로 반드시 일치해야 한다.
 * - MVP에서는 enum으로 제한하여 운영한다.
 * - 향후 관심사 무한 확장이 필요하면:
 *   ENUM → 테이블 row 기반(code/display_name/scope 등)으로 전환한다.
 */
public enum InterestName {
    EVENT,
    SESSION,
    EXPERIENCE,
    BOOTH,
    CONTEST,
    NOTICE,

    SNACK,
    BATH_SUPPLIES,
    GROOMING,
    TOY,
    CLOTHING,
    HEALTH,
    TRAINING,
    WALK,
    SUPPLEMENTS,
    ACCESSORIES,

    OTHERS
}
