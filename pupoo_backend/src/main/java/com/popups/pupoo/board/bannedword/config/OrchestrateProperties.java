package com.popups.pupoo.board.bannedword.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

import java.net.URI;

/**
 * IBM watsonx Orchestrate(또는 동등한 오케스트레이션) HTTP 트리거.
 * <p>
 * 실제 REST 경로·본문 스키마는 IBM 측 플로우/에이전트 설정에 맞게 조정한다.
 * 여기서는 JSON 웹훅 형태로 공통 필드를 전달한다.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "ai.orchestrate")
public class OrchestrateProperties {

    public static final String MODE_OFF = "OFF";
    public static final String MODE_NOTIFY_AFTER_SUCCESS = "NOTIFY_AFTER_SUCCESS";
    public static final String MODE_DISPATCH_ONLY = "DISPATCH_ONLY";

    private boolean enabled = false;
    /**
     * OFF | NOTIFY_AFTER_SUCCESS | DISPATCH_ONLY
     */
    private String mode = MODE_OFF;
    /**
     * 절대 URL이면 baseUrl/triggerPath 보다 우선한다.
     */
    private String webhookUrl = "";
    private String baseUrl = "";
    /**
     * baseUrl 에 붙는 경로 (예: /v1/hooks/moderation-policy)
     */
    private String triggerPath = "/";
    private String bearerToken = "";
    /**
     * Bearer 외 추가 헤더 (예: IBM API Key 헤더명).
     */
    private String extraHeaderName = "";
    private String extraHeaderValue = "";
    private int timeoutSeconds = 60;

    public boolean isDispatchOnly() {
        return enabled && MODE_DISPATCH_ONLY.equalsIgnoreCase(mode != null ? mode.trim() : "");
    }

    public boolean isNotifyAfterSuccess() {
        return enabled && MODE_NOTIFY_AFTER_SUCCESS.equalsIgnoreCase(mode != null ? mode.trim() : "");
    }

    public URI resolveTriggerUri() {
        if (StringUtils.hasText(webhookUrl)) {
            return URI.create(webhookUrl.trim());
        }
        String base = baseUrl != null ? baseUrl.trim() : "";
        if (!StringUtils.hasText(base)) {
            throw new IllegalStateException("ai.orchestrate.webhook-url 또는 ai.orchestrate.base-url 이 필요합니다.");
        }
        String path = triggerPath == null || triggerPath.isBlank() ? "/" : triggerPath.trim();
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return URI.create(base + path);
    }
}
