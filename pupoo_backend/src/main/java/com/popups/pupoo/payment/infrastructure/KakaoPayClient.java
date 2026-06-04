// file: src/main/java/com/popups/pupoo/payment/infrastructure/KakaoPayClient.java
package com.popups.pupoo.payment.infrastructure;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;

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
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("cid", req.cid());
        form.add("partner_order_id", req.partner_order_id());
        form.add("partner_user_id", req.partner_user_id());
        form.add("item_name", req.item_name());
        form.add("quantity", String.valueOf(req.quantity()));
        form.add("total_amount", String.valueOf(req.total_amount()));
        form.add("tax_free_amount", String.valueOf(req.tax_free_amount()));
        form.add("approval_url", req.approval_url());
        form.add("cancel_url", req.cancel_url());
        form.add("fail_url", req.fail_url());

        try {
            return client().post()
                    .uri(props.readyPath())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(form)
                    .retrieve()
                    .body(KakaoPayReadyResponse.class);
        } catch (RestClientResponseException e) {
            System.out.println("[KakaoPay][READY][ERROR] status=" + e.getRawStatusCode()
                    + ", body=" + e.getResponseBodyAsString());
            throw e;
        }
    }

    public KakaoPayApproveResponse approve(KakaoPayApproveRequest req) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("cid", req.cid());
        form.add("tid", req.tid());
        form.add("partner_order_id", req.partner_order_id());
        form.add("partner_user_id", req.partner_user_id());
        form.add("pg_token", req.pg_token());

        try {
            return client().post()
                    .uri(props.approvePath())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(form)
                    .retrieve()
                    .body(KakaoPayApproveResponse.class);
        } catch (RestClientResponseException e) {
            System.out.println("[KakaoPay][APPROVE][ERROR] status=" + e.getRawStatusCode()
                    + ", body=" + e.getResponseBodyAsString());
            throw e;
        }
    }

    public KakaoPayCancelResponse cancel(KakaoPayCancelRequest req) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("cid", req.cid());
        form.add("tid", req.tid());
        form.add("cancel_amount", String.valueOf(req.cancel_amount()));
        form.add("cancel_tax_free_amount", String.valueOf(req.cancel_tax_free_amount()));

        try {
            return client().post()
                    .uri(props.cancelPath())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(form)
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
