// file: src/main/java/com/popups/pupoo/payment/dto/PaymentApproveRequest.java
package com.popups.pupoo.payment.dto;

/**
 * 결제 승인(approve) 요청 DTO
 * - KakaoPay approve에 필요한 pg_token
 */
public record PaymentApproveRequest(
        String pgToken
) {
}
