// file: src/main/java/com/popups/pupoo/user/api/AdminUserController.java
package com.popups.pupoo.user.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.IdResponse;
import com.popups.pupoo.user.application.UserAdminService;
import com.popups.pupoo.user.dto.AdminUserUpdateRequest;
import com.popups.pupoo.user.dto.UserCreateRequest;
import com.popups.pupoo.user.dto.UserResponse;
import com.popups.pupoo.user.dto.UserSearchRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자용 사용자 관리 API
 * - GET    /api/admin/users
 * - GET    /api/admin/users/{id}
 * - POST   /api/admin/users
 * - PATCH  /api/admin/users/{id}
 * - DELETE /api/admin/users/{id} (soft delete)
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserAdminService userAdminService;

    @GetMapping
    public ApiResponse<Page<UserResponse>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) com.popups.pupoo.user.domain.enums.UserStatus status,
            Pageable pageable
    ) {
        UserSearchRequest cond = new UserSearchRequest();
        cond.setKeyword(keyword);
        cond.setStatus(status);
        return ApiResponse.success(userAdminService.list(cond, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<UserResponse> get(@PathVariable Long id) {
        return ApiResponse.success(userAdminService.get(id));
    }

    @PostMapping
    public ApiResponse<UserResponse> create(@Valid @RequestBody UserCreateRequest req) {
        return ApiResponse.success(userAdminService.create(req));
    }

    @PatchMapping("/{id}")
    public ApiResponse<UserResponse> update(@PathVariable Long id, @RequestBody AdminUserUpdateRequest req) {
        return ApiResponse.success(userAdminService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<IdResponse> delete(@PathVariable Long id) {
        userAdminService.delete(id);
        return ApiResponse.success(new IdResponse(id));
    }
}
