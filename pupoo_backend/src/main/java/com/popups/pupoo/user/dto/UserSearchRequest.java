// file: src/main/java/com/popups/pupoo/user/dto/UserSearchRequest.java
package com.popups.pupoo.user.dto;

import com.popups.pupoo.user.domain.enums.UserStatus;

/**
 * 관리자용 사용자 검색 조건
 */
public class UserSearchRequest {

    private String keyword; // email/nickname/phone 부분 검색
    private UserStatus status;

    public UserSearchRequest() {}

    public String getKeyword() { return keyword; }
    public UserStatus getStatus() { return status; }

    public void setKeyword(String keyword) { this.keyword = keyword; }
    public void setStatus(UserStatus status) { this.status = status; }

}
