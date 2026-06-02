// file: src/main/java/com/popups/pupoo/payment/api/PaymentController.java
package com.popups.pupoo.payment.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.PageResponse;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.payment.application.PaymentService;
import com.popups.pupoo.payment.dto.PaymentCreateRequest;
import com.popups.pupoo.payment.dto.PaymentReadyResponse;
import com.popups.pupoo.payment.dto.PaymentResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class PaymentController {

    private final PaymentService paymentService;
    
    private Long currentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            // 기능: 미인증 요청 차단
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof Long id) return id;

        // 혹시 문자열로 들어오는 케이스 방어
        if (principal instanceof String s) return Long.valueOf(s);

        // 기능: principal 타입 비정상(표준: userId(Long) 또는 String)
        throw new BusinessException(ErrorCode.UNAUTHORIZED);
    }


    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/events/{eventId}/payments")
    public ApiResponse<PaymentReadyResponse> requestPayment(
            @PathVariable("eventId") Long eventId,
            @RequestBody PaymentCreateRequest req
    ) {
        return ApiResponse.success(paymentService.requestPayment(currentUserId(), eventId, req));
    }

    @GetMapping("/payments/my")
    public ApiResponse<PageResponse<PaymentResponse>> myPayments(Pageable pageable) {
        Page<PaymentResponse> page = paymentService.myPayments(currentUserId(), pageable);
        return ApiResponse.success(PageResponse.from(page));
    }


    @PostMapping("/payments/{paymentId}/approve")
    public ApiResponse<PaymentResponse> approve(
            @PathVariable("paymentId") Long paymentId,
            @RequestParam("pg_token") String pgToken
    ) {
        return ApiResponse.success(paymentService.approvePayment(paymentId, pgToken));
    }

    @PostMapping("/payments/{paymentId}/cancel")
    public ApiResponse<PaymentResponse> cancel(
            @PathVariable("paymentId") Long paymentId
    ) {
        return ApiResponse.success(paymentService.cancelMyPayment(currentUserId(), paymentId));
    }
    
}
