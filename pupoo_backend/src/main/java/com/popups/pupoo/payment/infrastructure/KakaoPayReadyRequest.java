// file: src/main/java/com/popups/pupoo/payment/infrastructure/KakaoPayReadyRequest.java
package com.popups.pupoo.payment.infrastructure;

public record KakaoPayReadyRequest(
        String cid,
        String partner_order_id,
        String partner_user_id,
        String item_name,
        int quantity,
        int total_amount,
        int tax_free_amount,
        String approval_url,
        String cancel_url,
        String fail_url
) {}
