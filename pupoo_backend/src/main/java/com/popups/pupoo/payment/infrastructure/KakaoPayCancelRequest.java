// file: src/main/java/com/popups/pupoo/payment/infrastructure/KakaoPayCancelRequest.java
package com.popups.pupoo.payment.infrastructure;

public record KakaoPayCancelRequest(
        String cid,
        String tid,
        int cancel_amount,
        int cancel_tax_free_amount
) {}
