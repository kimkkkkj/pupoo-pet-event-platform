package com.popups.pupoo.ai.client;

import com.popups.pupoo.ai.config.AiServiceProperties;
import com.popups.pupoo.ai.dto.AiCongestionPredictionResponse;
import com.popups.pupoo.ai.dto.AiEventPredictionRequest;
import com.popups.pupoo.ai.dto.AiInternalApiResponse;
import com.popups.pupoo.ai.dto.AiPosterGenerateResponse;
import com.popups.pupoo.ai.dto.AiProgramPredictionRequest;
import com.popups.pupoo.ai.dto.AiProgramRecommendationRequest;
import com.popups.pupoo.ai.dto.AiProgramRecommendationResponse;
import com.popups.pupoo.event.dto.AdminEventPosterGenerateRequest;
import io.netty.channel.ChannelOption;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.Optional;

@Component
public class AiInferenceClient {

    private static final Logger log = LoggerFactory.getLogger(AiInferenceClient.class);
    private static final String HEADER_INTERNAL_TOKEN = "X-Internal-Token";
    private static final int MAX_ATTEMPTS = 2;

    private final WebClient webClient;
    private final AiServiceProperties properties;

    public AiInferenceClient(WebClient.Builder builder, AiServiceProperties properties) {
        this.properties = properties;
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, Math.toIntExact(properties.getConnectTimeoutMs()))
                .responseTimeout(Duration.ofMillis(resolveTransportResponseTimeoutMs()));
        ExchangeStrategies exchangeStrategies = ExchangeStrategies.builder()
                .codecs(codecs -> codecs.defaultCodecs().maxInMemorySize(resolveMaxInMemorySize()))
                .build();
        this.webClient = builder
                .baseUrl(properties.getBaseUrl())
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .exchangeStrategies(exchangeStrategies)
                .build();
    }

    public Optional<AiCongestionPredictionResponse> predictEvent(AiEventPredictionRequest request) {
        return post(
                "/internal/congestion/events/predict",
                request,
                new ParameterizedTypeReference<AiInternalApiResponse<AiCongestionPredictionResponse>>() {
                }
        );
    }

    public Optional<AiCongestionPredictionResponse> predictProgram(AiProgramPredictionRequest request) {
        return post(
                "/internal/congestion/programs/predict",
                request,
                new ParameterizedTypeReference<AiInternalApiResponse<AiCongestionPredictionResponse>>() {
                }
        );
    }

    public Optional<AiProgramRecommendationResponse> recommendPrograms(AiProgramRecommendationRequest request) {
        return post(
                "/internal/congestion/programs/recommendations",
                request,
                new ParameterizedTypeReference<AiInternalApiResponse<AiProgramRecommendationResponse>>() {
                }
        );
    }

    public Optional<AiPosterGenerateResponse> generatePoster(AdminEventPosterGenerateRequest request) {
        return post(
                "/internal/poster/generate",
                request,
                new ParameterizedTypeReference<AiInternalApiResponse<AiPosterGenerateResponse>>() {
                },
                properties.getPosterResponseTimeoutMs(),
                1
        );
    }

    private <T> Optional<T> post(
            String path,
            Object body,
            ParameterizedTypeReference<AiInternalApiResponse<T>> typeReference
    ) {
        return post(path, body, typeReference, properties.getResponseTimeoutMs(), MAX_ATTEMPTS);
    }

    private <T> Optional<T> post(
            String path,
            Object body,
            ParameterizedTypeReference<AiInternalApiResponse<T>> typeReference,
            long responseTimeoutMs,
            int maxAttempts
    ) {
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                AiInternalApiResponse<T> response = webClient.post()
                        .uri(path)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HEADER_INTERNAL_TOKEN, properties.getInternalToken())
                        .bodyValue(body)
                        .retrieve()
                        .bodyToMono(typeReference)
                        .block(Duration.ofMillis(responseTimeoutMs + 300));

                if (response != null && response.success() && response.data() != null) {
                    return Optional.of(response.data());
                }
            } catch (Exception exception) {
                if (attempt == maxAttempts) {
                    log.warn("AI request failed. path={}, attempts={}", path, attempt, exception);
                }
            }
        }
        return Optional.empty();
    }

    private long resolveTransportResponseTimeoutMs() {
        return Math.max(properties.getResponseTimeoutMs(), properties.getPosterResponseTimeoutMs());
    }

    private int resolveMaxInMemorySize() {
        long configured = properties.getMaxInMemorySizeBytes();
        if (configured <= 0L) {
            return 5 * 1024 * 1024;
        }
        return (int) Math.min(configured, Integer.MAX_VALUE);
    }
}
