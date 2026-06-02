// file: src/main/java/com/popups/pupoo/board/faq/api/AdminFaqController.java
package com.popups.pupoo.board.faq.api;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.board.faq.application.FaqAdminService;
import com.popups.pupoo.board.faq.dto.FaqCreateRequest;
import com.popups.pupoo.board.faq.dto.FaqUpdateRequest;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.IdResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/faqs")
public class AdminFaqController {

    private final FaqAdminService faqAdminService;
    private final SecurityUtil securityUtil;

    @PostMapping
    public ApiResponse<IdResponse> create(@Valid @RequestBody FaqCreateRequest req) {
        Long adminId = securityUtil.currentUserId();
        Long postId = faqAdminService.create(adminId, req);
        return ApiResponse.success(new IdResponse(postId));
    }

    @PatchMapping("/{postId}")
    public ApiResponse<IdResponse> update(@PathVariable Long postId, @Valid @RequestBody FaqUpdateRequest req) {
        faqAdminService.update(postId, req);
        return ApiResponse.success(new IdResponse(postId));
    }

    @DeleteMapping("/{postId}")
    public ApiResponse<IdResponse> delete(@PathVariable Long postId) {
        faqAdminService.delete(postId);
        return ApiResponse.success(new IdResponse(postId));
    }
}
