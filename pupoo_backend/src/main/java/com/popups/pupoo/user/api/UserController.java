// file: src/main/java/com/popups/pupoo/user/api/UserController.java
package com.popups.pupoo.user.api;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.MessageResponse;
import com.popups.pupoo.user.application.UserService;
import com.popups.pupoo.user.dto.UserMeResponse;
import com.popups.pupoo.user.dto.UserUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 로그인한 사용자의 내 정보 API를 제공한다.
 * 인증은 모두 필요하며, 토큰 발급은 담당하지 않고 조회/수정/탈퇴만 `UserService`에 위임한다.
 */
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final SecurityUtil securityUtil;

    /**
     * 현재 로그인 사용자의 프로필을 조회한다.
     */
    @GetMapping("/me")
    public ApiResponse<UserMeResponse> getMe() {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(userService.getMe(userId));
    }

    /**
     * 닉네임 중복 여부를 즉시 확인한다.
     */
    @GetMapping("/check-nickname")
    public ApiResponse<Boolean> checkNickname(@RequestParam("nickname") String nickname) {
        return ApiResponse.success(userService.isNicknameAvailable(nickname));
    }

    /**
     * 현재 로그인 사용자의 프로필을 부분 수정한다.
     * 휴대폰 번호 변경은 본인 인증 흐름과 분리되어 있으므로 여기서는 허용하지 않는다.
     */
    @PatchMapping("/me")
    public ApiResponse<UserMeResponse> updateMe(@RequestBody UserUpdateRequest req) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(userService.updateMe(userId, req));
    }

    /**
     * 현재 사용자를 soft delete 처리한다.
     * 실제 행 삭제 대신 `users.status=DELETED`로 전환한다.
     */
    @DeleteMapping("/me")
    public ApiResponse<MessageResponse> deleteMe() {
        Long userId = securityUtil.currentUserId();
        userService.deleteMe(userId);
        return ApiResponse.success(new MessageResponse("USER_DEACTIVATED"));
    }
}
