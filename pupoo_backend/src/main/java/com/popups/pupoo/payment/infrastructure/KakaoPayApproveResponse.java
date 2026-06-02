// file: src/main/java/com/popups/pupoo/payment/infrastructure/KakaoPayApproveResponse.java
package com.popups.pupoo.payment.infrastructure;

public record KakaoPayApproveResponse(
        String aid,
        String tid,
        String cid,
        String partner_order_id,
        String partner_user_id,
        String payment_method_type,
        String item_name,
        int quantity,
        String approved_at
) {}
