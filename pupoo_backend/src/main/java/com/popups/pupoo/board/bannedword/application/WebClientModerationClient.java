package com.popups.pupoo.board.bannedword.application;

import com.popups.pupoo.board.bannedword.config.ModerationProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class WebClientModerationClient implements ModerationClient {

    private final WebClient aiModerationWebClient;
    private final ModerationProperties properties;

    public WebClientModerationClient(
            @Qualifier("aiModerationWebClient") WebClient aiModerationWebClient,
            ModerationProperties properties
    ) {
        this.aiModerationWebClient = aiModerationWebClient;
        this.properties = properties;
    }

    @Override
    public ModerationResult moderate(String text, Long boardId, String contentType) {
        String preview = text == null ? "null" : text.length() <= 30 ? text : text.substring(0, 30) + "...";
        int textLen = text == null ? 0 : text.length();

        if (!properties.isEnabled()) {
            log.warn("AI moderation is disabled by config (baseUrl={})", properties.getBaseUrl());
            return blocked("\u0041\u0049 \uBAA8\uB354\uB808\uC774\uC158\uC774 \uBE44\uD65C\uC131\uD654\uB418\uC5B4 \uC694\uCCAD\uC744 \uCC28\uB2E8\uD588\uC2B5\uB2C8\uB2E4.", "disabled");
        }

        try {
            Map<String, Object> metadata = new HashMap<>();
            if (boardId != null) {
                metadata.put("boardId", boardId);
            }
            if (contentType != null) {
                metadata.put("boardType", contentType);
            }

            Map<String, Object> body = new HashMap<>();
            body.put("content", text != null ? text : "");
            body.put("text", text != null ? text : "");
            body.put("board_type", contentType);
            body.put("content_type", contentType);
            body.put("board_id", boardId);
            body.put("metadata", metadata);

            log.info("AI moderation request: boardId={}, contentType={}, baseUrl={}, textLen={}, preview='{}'",
                    boardId, contentType, properties.getBaseUrl(), textLen, preview);

            Map<?, ?> response = aiModerationWebClient
                    .post()
                    .uri("/internal/moderate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(Duration.ofMillis(Math.max(1000, properties.getReadTimeoutMs()) + 500L));

            if (response == null) {
                return blocked("\u0041\u0049 \uC11C\uBC84 \uC751\uB2F5\uC774 \uC5C6\uC5B4 \uC694\uCCAD\uC744 \uCC28\uB2E8\uD588\uC2B5\uB2C8\uB2E4.", "error");
            }

            String decision = asString(response.get("decision"));
            String action = asString(response.get("action"));
            String result = asString(response.get("result"));
            String normalized = normalizeAction(decision, action, result);
            String reason = asString(response.get("reason"));
            String stack = asString(response.get("stack"));
            Float score = asFloat(response.get("score"));
            if (score == null) {
                score = asFloat(response.get("ai_score"));
            }

            return ModerationResult.builder()
                    .action(normalized)
                    .aiScore(score)
                    .reason(reason)
                    .stack(stack != null ? stack : "unknown")
                    .build();
        } catch (WebClientResponseException e) {
            log.warn("AI moderation API error: {} {}", e.getStatusCode(), e.getResponseBodyAsString());
            log.warn("AI moderation API error context: boardId={}, contentType={}, baseUrl={}, textLen={}, preview='{}'",
                    boardId, contentType, properties.getBaseUrl(), textLen, preview);
            return blocked("\u0041\u0049 \uC11C\uBC84 \uC624\uB958\uB85C \uC694\uCCAD\uC744 \uCC28\uB2E8\uD588\uC2B5\uB2C8\uB2E4.", "error");
        } catch (Exception e) {
            String errMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            log.warn("AI moderation call failed: {} (baseUrl={})", errMsg, properties.getBaseUrl(), e);
            log.warn("AI moderation call failed context: boardId={}, contentType={}, baseUrl={}, textLen={}, preview='{}'",
                    boardId, contentType, properties.getBaseUrl(), textLen, preview);
            return blocked("\u0041\u0049 \uC11C\uBC84 \uC5F0\uACB0 \uC2E4\uD328\uB85C \uC694\uCCAD\uC744 \uCC28\uB2E8\uD588\uC2B5\uB2C8\uB2E4.", "error");
        }
    }

    private ModerationResult blocked(String reason, String stack) {
        return ModerationResult.builder()
                .action("BLOCK")
                .reason(reason)
                .stack(stack)
                .build();
    }

    private String normalizeAction(String decision, String action, String result) {
        String primary = asString(decision);
        String secondary = asString(action);
        String tertiary = asString(result);

        if (isAllowLike(primary) || isAllowLike(secondary) || isAllowLike(tertiary)) {
            return "ALLOW";
        }
        if ("WARN".equalsIgnoreCase(primary) || "WARN".equalsIgnoreCase(secondary) || "WARN".equalsIgnoreCase(tertiary)) {
            return "WARN";
        }
        if ("REVIEW".equalsIgnoreCase(primary) || "REVIEW".equalsIgnoreCase(secondary) || "REVIEW".equalsIgnoreCase(tertiary)) {
            return "REVIEW";
        }
        if ("BLOCK".equalsIgnoreCase(primary) || "BLOCK".equalsIgnoreCase(secondary) || "BLOCK".equalsIgnoreCase(tertiary)) {
            return "BLOCK";
        }
        return "BLOCK";
    }

    private boolean isAllowLike(String value) {
        return "PASS".equalsIgnoreCase(value) || "ALLOW".equalsIgnoreCase(value);
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private Float asFloat(Object value) {
        if (value instanceof Number number) {
            return number.floatValue();
        }
        try {
            return value == null ? null : Float.parseFloat(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}
