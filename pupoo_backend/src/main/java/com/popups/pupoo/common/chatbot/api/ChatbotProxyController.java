package com.popups.pupoo.common.chatbot.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.popups.pupoo.ai.config.AiServiceProperties;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping
public class ChatbotProxyController {

    private static final Duration TIMEOUT = Duration.ofSeconds(30);
    private static final String HEADER_INTERNAL_TOKEN = "X-Internal-Token";

    private final WebClient webClient;
    private final AiServiceProperties properties;
    private final ObjectMapper objectMapper;

    public ChatbotProxyController(WebClient.Builder builder, AiServiceProperties props, ObjectMapper objectMapper) {
        this.properties = props;
        this.objectMapper = objectMapper;
        this.webClient = builder
                .baseUrl(props.getBaseUrl())
                .build();
    }

    @PostMapping("/api/chatbot/chat")
    public ResponseEntity<ApiResponse<Map<String, Object>>> userChat(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            HttpServletRequest request
    ) {
        return forwardChat(body, authorization, request, "/internal/chatbot/chat", "user");
    }

    @PostMapping("/api/admin/chatbot/chat")
    public ResponseEntity<ApiResponse<Map<String, Object>>> adminChat(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            HttpServletRequest request
    ) {
        return forwardChat(body, authorization, request, "/internal/admin/chatbot/chat", "admin");
    }

    private ResponseEntity<ApiResponse<Map<String, Object>>> forwardChat(
            Map<String, Object> body,
            String authorization,
            HttpServletRequest request,
            String uri,
            String role
    ) {
        try {
            WebClient.RequestBodySpec webClientRequest = webClient.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON);

            if (StringUtils.hasText(properties.getInternalToken())) {
                webClientRequest.header(HEADER_INTERNAL_TOKEN, properties.getInternalToken());
            }

            if (StringUtils.hasText(authorization)) {
                webClientRequest.header(HttpHeaders.AUTHORIZATION, authorization);
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> result = webClientRequest
                    .bodyValue(withForcedRole(body, role))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(TIMEOUT);

            return ResponseEntity.ok(ApiResponse.success(extractData(result)));
        } catch (WebClientResponseException e) {
            log.warn("[chatbot-proxy] AI server error: status={}", e.getStatusCode());
            return ResponseEntity.status(e.getStatusCode())
                    .body(ApiResponse.fail(parseErrorBody(e, request)));
        } catch (Exception e) {
            log.warn("[chatbot-proxy] AI server unreachable: {}", e.getMessage());
            return ResponseEntity.status(503)
                    .body(ApiResponse.fail(errorBody(
                            "AI_SERVER_UNAVAILABLE",
                            "AI 서버와 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
                            503,
                            request
                    )));
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> withForcedRole(Map<String, Object> body, String role) {
        Map<String, Object> nextBody = new LinkedHashMap<>();
        if (body != null) {
            nextBody.putAll(body);
        }

        Object rawContext = nextBody.get("context");
        Map<String, Object> context = new LinkedHashMap<>();
        if (rawContext instanceof Map<?, ?> rawMap) {
            rawMap.forEach((key, value) -> context.put(String.valueOf(key), value));
        }
        context.put("role", role);
        nextBody.put("context", context);
        return nextBody;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractData(Map<String, Object> result) {
        if (result == null || result.isEmpty()) {
            return Map.of();
        }

        Object data = result.get("data");
        if (data instanceof Map<?, ?> map) {
            Map<String, Object> normalized = new LinkedHashMap<>();
            map.forEach((key, value) -> normalized.put(String.valueOf(key), value));
            return normalized;
        }
        return new LinkedHashMap<>(result);
    }

    private ErrorResponse parseErrorBody(WebClientResponseException e, HttpServletRequest request) {
        try {
            Map<String, Object> parsed = objectMapper.readValue(
                    e.getResponseBodyAsByteArray(),
                    new TypeReference<>() {}
            );
            if (parsed != null && !parsed.isEmpty()) {
                String message = extractMessage(parsed);
                if (StringUtils.hasText(message)) {
                    String code = stringValue(parsed.get("code"));
                    return errorBody(
                            StringUtils.hasText(code) ? code : "AI_SERVER_ERROR",
                            message,
                            e.getStatusCode().value(),
                            request
                    );
                }
            }
        } catch (Exception ignored) {
        }

        return errorBody(
                "AI_SERVER_ERROR",
                "AI 서버에서 오류가 발생했습니다.",
                e.getStatusCode().value(),
                request
        );
    }

    private ErrorResponse errorBody(String code, String message, int status, HttpServletRequest request) {
        return new ErrorResponse(code, message, status, request.getRequestURI());
    }

    private String extractMessage(Map<String, Object> parsed) {
        Object data = parsed.get("data");
        if (data instanceof Map<?, ?> dataMap) {
            String dataMessage = stringValue(dataMap.get("message"));
            if (StringUtils.hasText(dataMessage)) {
                return dataMessage;
            }
        }

        Object error = parsed.get("error");
        if (error instanceof Map<?, ?> errorMap) {
            String errorMessage = stringValue(errorMap.get("message"));
            if (StringUtils.hasText(errorMessage)) {
                return errorMessage;
            }
        }

        String topLevelMessage = stringValue(parsed.get("message"));
        if (StringUtils.hasText(topLevelMessage)) {
            return topLevelMessage;
        }
        return null;
    }

    private String stringValue(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value);
        return text.isBlank() ? null : text;
    }
}
