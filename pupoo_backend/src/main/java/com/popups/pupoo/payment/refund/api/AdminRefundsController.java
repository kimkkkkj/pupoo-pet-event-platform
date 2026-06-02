// file: src/main/java/com/popups/pupoo/payment/refund/api/AdminRefundsController.java
package com.popups.pupoo.payment.refund.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.payment.refund.application.RefundAdminService;
import com.popups.pupoo.payment.refund.domain.enums.RefundStatus;
import com.popups.pupoo.payment.refund.dto.RefundResponse;
import com.popups.pupoo.payment.refund.persistence.RefundRepository;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminRefundsController {

    private final RefundRepository refundRepository;
    private final RefundAdminService refundAdminService;

    public AdminRefundsController(RefundRepository refundRepository, RefundAdminService refundAdminService) {
        this.refundRepository = refundRepository;
        this.refundAdminService = refundAdminService;
    }

    @GetMapping("/refunds")
    public ApiResponse<Page<RefundResponse>> refunds(@RequestParam(value = "status", required = false) String status,
                                                     Pageable pageable) {
        if (status == null || status.isBlank()) {
            return ApiResponse.success(refundRepository.findAdminRefunds(pageable).map(RefundResponse::fromRow));
        }
        // 정책: 외부 입력은 REFUNDED를 허용하되 내부 상태(COMPLETED)로 매핑한다.
        String raw = status.toUpperCase();
        RefundStatus s = "REFUNDED".equals(raw) ? RefundStatus.COMPLETED : RefundStatus.valueOf(raw);
        return ApiResponse.success(
                refundRepository.findAdminRefundsByStatus(s, pageable).map(RefundResponse::fromRow)
        );
    }

    @GetMapping("/refunds/{id}")
    public ApiResponse<RefundResponse> refund(@PathVariable Long id) {
        return ApiResponse.success(refundRepository.findAdminRefundDetail(id)
                .map(RefundResponse::fromRow)
                .orElseThrow(() -> new BusinessException(ErrorCode.REFUND_NOT_FOUND)));
    }

    /**
     * 환불 승인(관리자).
     * 정책: 승인형 + 혼합 실행(C)
     * - 관리자 승인 케이스는 승인(APPROVED)만 수행하고,
     * - 실제 PG 취소(완료)는 별도 execute 엔드포인트에서 수행한다.
     */
    @PatchMapping("/refunds/{refundId}/approve")
    public ApiResponse<RefundResponse> approve(@PathVariable Long refundId,
                                               @RequestParam(value = "reason", required = false) String reason) {
        return ApiResponse.success(refundAdminService.approve(refundId, reason));
    }

    /**
     * 환불 거절(관리자).
     */
    @PatchMapping("/refunds/{refundId}/reject")
    public ApiResponse<RefundResponse> reject(@PathVariable Long refundId,
                                              @RequestParam(value = "reason", required = false) String reason) {
        return ApiResponse.success(refundAdminService.reject(refundId, reason));
    }

    /**
     * 환불 실행(관리자).
     * - APPROVED 상태인 환불을 PG 취소 호출하여 COMPLETED로 확정한다.
     */
    @PostMapping("/refunds/{refundId}/execute")
    public ApiResponse<RefundResponse> execute(@PathVariable Long refundId) {
        return ApiResponse.success(refundAdminService.execute(refundId));
    }
}
