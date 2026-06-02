// file: src/main/java/com/popups/pupoo/payment/dto/PaymentReadyResponse.java
package com.popups.pupoo.payment.dto;

public record PaymentReadyResponse(
        Long paymentId,
        String orderNo,
        String tid,
        String redirectPcUrl,
        String redirectMobileUrl
) {}
