// file: src/main/java/com/popups/pupoo/payment/infrastructure/KakaoPayClient.java
package com.popups.pupoo.payment.infrastructure;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;

import java.util.LinkedHashMap;
import java.util.Map;

@Profile("!test")
@Component
public class KakaoPayClient {

    private final RestClient.Builder builder;
    private final KakaoPayProperties props;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private volatile RestClient restClient;

    public KakaoPayClient(RestClient.Builder builder, KakaoPayProperties props) {
        this.builder = builder;
        this.props = props;
    }

    private RestClient client() {
        if (restClient != null) {
            return restClient;
        }

        synchronized (this) {
            if (restClient != null) {
                return restClient;
            }

            String secret = props.secretKey();

         // 🔍 === DEBUG LOG START ===
            System.out.println("[KakaoPay][CONF] secretRaw="
                    + (secret == null ? "null"
                    : (secret.length() <= 12 ? secret
                    : secret.substring(0, 6) + "..." + secret.substring(secret.length() - 4))));

            System.out.println("[KakaoPay][CONF] secretBlank="
                    + (secret == null || secret.isBlank())
                    + ", isMissing=" + "__MISSING__".equals(secret)
                    + ", containsDollar=" + (secret != null && secret.contains("$"))
                    + ", prefix='" + props.authorizationPrefix() + "'");
            // 🔍 === DEBUG LOG END ===

            //  부팅은 허용, 호출 시점에만 막는다.
            if (secret == null || secret.isBlank() || secret.contains("$") || "__MISSING__".equals(secret)) {
                // 기능: PG 시크릿 미설정(운영/로컬 설정 오류)
                throw new BusinessException(ErrorCode.PAYMENT_PG_ERROR, "KakaoPay secret key is missing");
            }

            // 인증 헤더: prefix 와 key 사이 공백을 보장한다.
            // - 신 open-api:  "SECRET_KEY {key}"
            // - 구 kapi:      "KakaoAK {adminKey}"
            String prefix = props.authorizationPrefix() == null ? "" : props.authorizationPrefix().trim();
            String auth = prefix.isEmpty() ? secret : prefix + " " + secret;

            System.out.println("[KakaoPay] init RestClient, authPrefix=" + prefix
                    + ", secretLen=" + secret.length());

            restClient = builder
                    .baseUrl(props.baseUrl())
                    .defaultHeader("Authorization", auth)
                    .build();

            return restClient;
        }
    }

    public KakaoPayReadyResponse ready(KakaoPayReadyRequest req) {
        // 신 open-api(/online/v1)는 JSON 본문만 받는다. (form-urlencoded로 보내면 error_code -1)
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("cid", req.cid());
        body.put("partner_order_id", req.partner_order_id());
        body.put("partner_user_id", req.partner_user_id());
        body.put("item_name", req.item_name());
        body.put("quantity", req.quantity());
        body.put("total_amount", req.total_amount());
        body.put("tax_free_amount", req.tax_free_amount());
        body.put("approval_url", req.approval_url());
        body.put("cancel_url", req.cancel_url());
        body.put("fail_url", req.fail_url());

        try {
            return client().post()
                    .uri(props.readyPath())
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(KakaoPayReadyResponse.class);
        } catch (RestClientResponseException e) {
            System.out.println("[KakaoPay][READY][ERROR] status=" + e.getRawStatusCode()
                    + ", body=" + e.getResponseBodyAsString());
            throw e;
        }
    }

    public KakaoPayApproveResponse approve(KakaoPayApproveRequest req) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("cid", req.cid());
        body.put("tid", req.tid());
        body.put("partner_order_id", req.partner_order_id());
        body.put("partner_user_id", req.partner_user_id());
        body.put("pg_token", req.pg_token());

        try {
            return client().post()
                    .uri(props.approvePath())
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(KakaoPayApproveResponse.class);
        } catch (RestClientResponseException e) {
            System.out.println("[KakaoPay][APPROVE][ERROR] status=" + e.getRawStatusCode()
                    + ", body=" + e.getResponseBodyAsString());
            throw e;
        }
    }

    public KakaoPayCancelResponse cancel(KakaoPayCancelRequest req) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("cid", req.cid());
        body.put("tid", req.tid());
        body.put("cancel_amount", req.cancel_amount());
        body.put("cancel_tax_free_amount", req.cancel_tax_free_amount());

        try {
            return client().post()
                    .uri(props.cancelPath())
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(KakaoPayCancelResponse.class);
        } catch (RestClientResponseException e) {
            System.out.println("[KakaoPay][CANCEL][ERROR] status=" + e.getRawStatusCode()
                    + ", body=" + e.getResponseBodyAsString());
            throw e;
        }
    }

    public String toJson(Object o) {
        try { return objectMapper.writeValueAsString(o); }
        catch (Exception e) { return "{\"_error\":\"json serialize failed\"}"; }
    }

    /**
     * ready 원문(JSON) -> KakaoPayReadyResponse 역직렬화
     * - 멱등 ready 응답을 재구성할 때 사용한다.
     */
    public KakaoPayReadyResponse parseReadyResponse(String rawJson) {
        try {
            return objectMapper.readValue(rawJson, KakaoPayReadyResponse.class);
        } catch (Exception e) {
            // 기능: 원문 JSON 파싱 실패는 운영상 PG 오류로 취급
            throw new BusinessException(ErrorCode.PAYMENT_PG_ERROR);
        }
    }
}
