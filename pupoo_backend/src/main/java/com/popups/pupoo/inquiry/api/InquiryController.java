// file: src/main/java/com/popups/pupoo/inquiry/api/InquiryController.java
package com.popups.pupoo.inquiry.api;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.MessageResponse;
import com.popups.pupoo.inquiry.application.InquiryAdminService;
import com.popups.pupoo.inquiry.application.InquiryService;
import com.popups.pupoo.inquiry.domain.enums.InquiryStatus;
import com.popups.pupoo.inquiry.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;
    private final InquiryAdminService inquiryAdminService;
    private final SecurityUtil securityUtil;

    @PostMapping("/api/inquiries")
    public ApiResponse<Long> createInquiry(@RequestBody InquiryCreateRequest req) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(inquiryService.createInquiry(userId, req));
    }

    @GetMapping("/api/inquiries/mine")
    public ApiResponse<Page<InquiryResponse>> getMyInquiries(@RequestParam(required = false) InquiryStatus status,
                                                             Pageable pageable) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(inquiryService.getMyInquiries(userId, status, pageable));
    }

    @GetMapping("/api/inquiries/{inquiryId}")
    public ApiResponse<InquiryResponse> getMyInquiry(@PathVariable Long inquiryId) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(inquiryService.getMyInquiry(userId, inquiryId));
    }

    @PutMapping("/api/inquiries/{inquiryId}")
    public ApiResponse<InquiryResponse> updateMyInquiry(@PathVariable Long inquiryId, @RequestBody InquiryUpdateRequest req) {
        Long userId = securityUtil.currentUserId();
        inquiryService.updateMyInquiry(userId, inquiryId, req);
        return ApiResponse.success(inquiryService.getMyInquiry(userId, inquiryId));
    }

    @PatchMapping("/api/inquiries/{inquiryId}/close")
    public ApiResponse<InquiryResponse> closeMyInquiry(@PathVariable Long inquiryId) {
        Long userId = securityUtil.currentUserId();
        inquiryService.closeMyInquiry(userId, inquiryId);
        return ApiResponse.success(inquiryService.getMyInquiry(userId, inquiryId));
    }

    @GetMapping("/api/admin/inquiries")
    public ApiResponse<Page<InquiryResponse>> getInquiries(@RequestParam(required = false) InquiryStatus status,
                                                           @RequestParam(required = false) String keyword,
                                                           Pageable pageable) {
        return ApiResponse.success(inquiryAdminService.getInquiries(status, keyword, pageable));
    }

    @PutMapping("/api/admin/inquiries/{inquiryId}/answer")
    public ApiResponse<MessageResponse> answer(@PathVariable Long inquiryId, @RequestBody InquiryAnswerRequest req) {
        Long adminId = securityUtil.currentUserId();
        inquiryAdminService.answer(adminId, inquiryId, req);
        return ApiResponse.success(new MessageResponse("ANSWER_SAVED"));
    }

    @PatchMapping("/api/admin/inquiries/{inquiryId}/status")
    public ApiResponse<MessageResponse> changeStatus(@PathVariable Long inquiryId, @RequestParam InquiryStatus status) {
        inquiryAdminService.changeStatus(inquiryId, status);
        return ApiResponse.success(new MessageResponse("STATUS_CHANGED"));
    }
}
