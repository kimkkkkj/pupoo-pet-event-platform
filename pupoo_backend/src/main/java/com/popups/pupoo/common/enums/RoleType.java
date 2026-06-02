// file: src/main/java/com/popups/pupoo/common/enums/RoleType.java
package com.popups.pupoo.common.enums;

/**
 * 공통 권한 타입.
 *
 * 주의
 * - 실제 인증/인가에서는 user.domain.enums.RoleName을 기본으로 사용한다.
 * - 외부 연동/공통 DTO에서 단순 권한 값을 표현할 때 사용한다.
 */
public enum RoleType {
    USER,
    ADMIN
}
