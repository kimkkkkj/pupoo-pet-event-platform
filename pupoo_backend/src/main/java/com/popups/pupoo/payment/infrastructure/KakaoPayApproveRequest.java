// file: src/main/java/com/popups/pupoo/payment/infrastructure/KakaoPayApproveRequest.java
package com.popups.pupoo.payment.infrastructure;

public record KakaoPayApproveRequest(
        String cid,
        String tid,
        String partner_order_id,
        String partner_user_id,
        String pg_token
) {}
