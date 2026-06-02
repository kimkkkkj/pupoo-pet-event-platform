// file: src/main/java/com/popups/pupoo/payment/infrastructure/KakaoPayReadyResponse.java
package com.popups.pupoo.payment.infrastructure;

public record KakaoPayReadyResponse(
        String tid,
        String next_redirect_pc_url,
        String next_redirect_mobile_url,
        String created_at
) {}
