// file: src/main/java/com/popups/pupoo/payment/infrastructure/KakaoPayProperties.java
package com.popups.pupoo.payment.infrastructure;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "kakaopay")
public record KakaoPayProperties(
        String baseUrl,
        String secretKey,
        String authorizationPrefix,
        String cid,
        String readyPath,
        String approvePath,
        String cancelPath,
        String approvalUrl,
        String cancelUrl,
        String failUrl
) {}
