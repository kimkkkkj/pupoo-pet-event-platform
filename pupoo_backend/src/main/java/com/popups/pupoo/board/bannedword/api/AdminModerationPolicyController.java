package com.popups.pupoo.board.bannedword.api;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.board.bannedword.application.ModerationPolicyAdminService;
import com.popups.pupoo.board.bannedword.application.ModerationPolicyUploadService;
import com.popups.pupoo.board.bannedword.dto.ActivePolicyResponse;
import com.popups.pupoo.board.bannedword.dto.ModerationPolicyUploadResponse;
import com.popups.pupoo.board.bannedword.dto.PolicyUploadActivateResponse;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/moderation")
public class AdminModerationPolicyController {

    private final ModerationPolicyAdminService moderationPolicyAdminService;
    private final ModerationPolicyUploadService moderationPolicyUploadService;
    private final SecurityUtil securityUtil;

    @GetMapping("/policies/active")
    public ApiResponse<ActivePolicyResponse> getActive() {
        return ApiResponse.success(moderationPolicyAdminService.getActivePolicy());
    }

    /**
     * 정책 업로드 이력 (최신이 앞쪽 — policy_upload_id 내림차순)
     */
    @GetMapping("/policies/uploads")
    public ApiResponse<PageResponse<ModerationPolicyUploadResponse>> listUploads(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ApiResponse.success(PageResponse.from(moderationPolicyUploadService.page(pageable)));
    }

    @PostMapping(value = "/policies/upload", consumes = "multipart/form-data")
    public ApiResponse<PolicyUploadActivateResponse> uploadAndActivate(
            @RequestPart("file") MultipartFile file
    ) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(moderationPolicyAdminService.uploadAndActivate(file, userId));
    }
}

