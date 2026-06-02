// file: src/main/java/com/popups/pupoo/payment/api/AdminPaymentsController.java
package com.popups.pupoo.payment.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.payment.domain.model.Payment;
import com.popups.pupoo.payment.dto.PaymentResponse;
import com.popups.pupoo.payment.persistence.PaymentRepository;
import com.popups.pupoo.payment.refund.application.RefundService;
import com.popups.pupoo.payment.refund.dto.RefundRequest;
import com.popups.pupoo.payment.refund.dto.RefundResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminPaymentsController {

    private static final String ADMIN_REFUND_REASON = "관리자 결제관리 환불";

    private final PaymentRepository paymentRepository;
    private final RefundService refundService;

    public AdminPaymentsController(PaymentRepository paymentRepository, RefundService refundService) {
        this.paymentRepository = paymentRepository;
        this.refundService = refundService;
    }

    @GetMapping("/payments")
    public ApiResponse<Page<PaymentResponse>> payments(Pageable pageable) {
        return ApiResponse.success(
                paymentRepository.findAdminPaymentHistory(pageable).map(PaymentResponse::fromAdminRow)
        );
    }

    @GetMapping("/payments/{id}")
    public ApiResponse<PaymentResponse> payment(@PathVariable Long id) {
        return ApiResponse.success(
                paymentRepository.findAdminPaymentDetail(id)
                        .map(PaymentResponse::fromAdminRow)
                        .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND))
        );
    }

    @GetMapping("/dashboard/events/{eventId}/payments")
    public ApiResponse<List<PaymentResponse>> paymentsByEvent(@PathVariable Long eventId) {
        return ApiResponse.success(
                paymentRepository.findAdminPaymentsByEventId(eventId).stream()
                        .map(PaymentResponse::fromAdminRow)
                        .toList()
        );
    }

    @PostMapping("/dashboard/payments/{paymentId}/refund")
    public ApiResponse<RefundResponse> refundPayment(@PathVariable Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND));

        return ApiResponse.success(refundService.requestRefund(
                payment.getUserId(),
                new RefundRequest(paymentId, payment.getAmount(), ADMIN_REFUND_REASON)
        ));
    }

    @PostMapping("/dashboard/payments/bulk-refund")
    public ApiResponse<Map<String, Object>> bulkRefund(@RequestBody Map<String, List<Long>> body) {
        List<Long> paymentIds = body.getOrDefault("paymentIds", List.of());
        List<Long> refundedIds = new ArrayList<>();
        List<Long> failedIds = new ArrayList<>();

        for (Long paymentId : paymentIds) {
            if (paymentId == null) {
                continue;
            }

            try {
                Payment payment = paymentRepository.findById(paymentId)
                        .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND));

                refundService.requestRefund(
                        payment.getUserId(),
                        new RefundRequest(paymentId, payment.getAmount(), ADMIN_REFUND_REASON)
                );
                refundedIds.add(paymentId);
            } catch (Exception ex) {
                failedIds.add(paymentId);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("requested", paymentIds.size());
        result.put("refunded", refundedIds.size());
        result.put("refundedIds", refundedIds);
        result.put("failed", failedIds.size());
        result.put("failedIds", failedIds);
        return ApiResponse.success(result);
    }
}