// file: src/main/java/com/popups/pupoo/payment/refund/api/RefundController.java
package com.popups.pupoo.payment.refund.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.payment.refund.application.RefundService;
import com.popups.pupoo.payment.refund.dto.*;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class RefundController {

    private final RefundService refundService;

    private final SecurityUtil securityUtil;


    public RefundController(RefundService refundService, SecurityUtil securityUtil) {
        this.refundService = refundService;
        this.securityUtil = securityUtil;
    }

    @PostMapping("/refunds")
    public ApiResponse<RefundResponse> requestRefund(@RequestBody RefundRequest req) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(refundService.requestRefund(userId, req));
    }

    @GetMapping("/refunds/my")
    public ApiResponse<Page<RefundResponse>> myRefunds(Pageable pageable) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(refundService.myRefunds(userId, pageable));
    }
}
