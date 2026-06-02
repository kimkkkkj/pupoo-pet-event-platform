// file: src/main/java/com/popups/pupoo/user/domain/enums/UserStatus.java
package com.popups.pupoo.user.domain.enums;

/**
 * 사용자 계정 상태다.
 * `DELETED`는 soft delete 상태이므로 로그인과 토큰 재발급이 모두 차단된다.
 */
public enum UserStatus {

    ACTIVE,
    SUSPENDED,
    DELETED

}
