package com.popups.pupoo.common.observability.application;

import com.popups.pupoo.common.observability.dto.AdminOperationsMetricsResponse;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class OperationsMetricsService {

    private static final String AUTH_LOGIN_METRIC = "pupoo.auth.login.requests";
    private static final String AUTH_SIGNUP_START_METRIC = "pupoo.auth.signup.start.requests";
    private static final String AUTH_SIGNUP_COMPLETE_METRIC = "pupoo.auth.signup.complete.requests";
    private static final String AUTH_REFRESH_METRIC = "pupoo.auth.refresh.requests";
    private static final String PAYMENT_STAGE_METRIC = "pupoo.payment.stage.requests";
    private static final String AI_PREDICTION_METRIC = "pupoo.ai.prediction.requests";
    private static final String SSE_CONNECT_METRIC = "pupoo.notification.sse.connection.requests";
    private static final String SSE_DISCONNECT_METRIC = "pupoo.notification.sse.disconnects";

    private final MeterRegistry meterRegistry;

    public OperationsMetricsService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    public void recordLoginSuccess(String loginKind) {
        increment(
                AUTH_LOGIN_METRIC,
                Tags.of(
                        "loginKind", normalizeTagValue(loginKind, "unknown"),
                        "outcome", "success",
                        "reason", "none"
                )
        );
    }

    public void recordLoginFailure(String loginKind, String reason) {
        increment(
                AUTH_LOGIN_METRIC,
                Tags.of(
                        "loginKind", normalizeTagValue(loginKind, "unknown"),
                        "outcome", "failure",
                        "reason", normalizeTagValue(reason, "unknown")
                )
        );
    }

    public void recordSignupStartSuccess() {
        increment(
                AUTH_SIGNUP_START_METRIC,
                Tags.of("outcome", "success", "reason", "none")
        );
    }

    public void recordSignupStartFailure(String reason) {
        increment(
                AUTH_SIGNUP_START_METRIC,
                Tags.of("outcome", "failure", "reason", normalizeTagValue(reason, "unknown"))
        );
    }

    public void recordSignupCompleteSuccess() {
        increment(
                AUTH_SIGNUP_COMPLETE_METRIC,
                Tags.of("outcome", "success", "reason", "none")
        );
    }

    public void recordSignupCompleteFailure(String reason) {
        increment(
                AUTH_SIGNUP_COMPLETE_METRIC,
                Tags.of("outcome", "failure", "reason", normalizeTagValue(reason, "unknown"))
        );
    }

    public void recordRefreshSuccess() {
        increment(
                AUTH_REFRESH_METRIC,
                Tags.of("outcome", "success", "reason", "none")
        );
    }

    public void recordRefreshFailure(String reason) {
        increment(
                AUTH_REFRESH_METRIC,
                Tags.of("outcome", "failure", "reason", normalizeTagValue(reason, "unknown"))
        );
    }

    public void recordPaymentStageSuccess(String stage, String provider) {
        increment(
                PAYMENT_STAGE_METRIC,
                Tags.of(
                        "stage", normalizeTagValue(stage, "unknown"),
                        "provider", normalizeTagValue(provider, "unknown"),
                        "outcome", "success",
                        "reason", "none"
                )
        );
    }

    public void recordPaymentStageFailure(String stage, String provider, String reason) {
        increment(
                PAYMENT_STAGE_METRIC,
                Tags.of(
                        "stage", normalizeTagValue(stage, "unknown"),
                        "provider", normalizeTagValue(provider, "unknown"),
                        "outcome", "failure",
                        "reason", normalizeTagValue(reason, "unknown")
                )
        );
    }

    public void recordAiPrediction(String targetType, boolean fallbackUsed) {
        increment(
                AI_PREDICTION_METRIC,
                Tags.of(
                        "targetType", normalizeTagValue(targetType, "unknown"),
                        "outcome", fallbackUsed ? "fallback" : "model"
                )
        );
    }

    public void recordSseConnect(boolean reconnect) {
        increment(
                SSE_CONNECT_METRIC,
                Tags.of("mode", reconnect ? "reconnect" : "connect")
        );
    }

    public void recordSseDisconnect(String reason) {
        increment(
                SSE_DISCONNECT_METRIC,
                Tags.of("reason", normalizeTagValue(reason, "unknown"))
        );
    }

    public AdminOperationsMetricsResponse buildSummary(String instanceId, long activeConnectionCount) {
        return new AdminOperationsMetricsResponse(
                "pod",
                normalizeTagValue(instanceId, "local"),
                LocalDateTime.now(),
                new AdminOperationsMetricsResponse.AuthMetrics(
                        buildOperationSummary(AUTH_SIGNUP_START_METRIC, Tags.empty()),
                        buildOperationSummary(AUTH_SIGNUP_COMPLETE_METRIC, Tags.empty()),
                        buildOperationSummary(AUTH_LOGIN_METRIC, Tags.of("loginKind", "password")),
                        buildOperationSummary(AUTH_LOGIN_METRIC, Tags.of("loginKind", "social")),
                        buildOperationSummary(AUTH_LOGIN_METRIC, Tags.of("loginKind", "signup")),
                        buildOperationSummary(AUTH_REFRESH_METRIC, Tags.empty())
                ),
                new AdminOperationsMetricsResponse.PaymentMetrics(
                        buildOperationSummary(PAYMENT_STAGE_METRIC, Tags.of("stage", "ready", "provider", "kakaopay")),
                        buildOperationSummary(PAYMENT_STAGE_METRIC, Tags.of("stage", "approve", "provider", "kakaopay")),
                        buildOperationSummary(PAYMENT_STAGE_METRIC, Tags.of("stage", "cancel", "provider", "kakaopay"))
                ),
                new AdminOperationsMetricsResponse.AiMetrics(
                        buildPredictionSummary("event"),
                        buildPredictionSummary("program")
                ),
                new AdminOperationsMetricsResponse.NotificationSseMetrics(
                        counterCount(SSE_CONNECT_METRIC, Tags.of("mode", "connect")),
                        counterCount(SSE_CONNECT_METRIC, Tags.of("mode", "reconnect")),
                        counterCount(SSE_DISCONNECT_METRIC, Tags.of("reason", "completed")),
                        counterCount(SSE_DISCONNECT_METRIC, Tags.of("reason", "timeout")),
                        counterCount(SSE_DISCONNECT_METRIC, Tags.of("reason", "error")),
                        counterCount(SSE_DISCONNECT_METRIC, Tags.of("reason", "send_failure")),
                        activeConnectionCount
                )
        );
    }

    private AdminOperationsMetricsResponse.OperationSummary buildOperationSummary(String metricName, Tags baseTags) {
        long successCount = counterCount(metricName, baseTags.and("outcome", "success"));
        long failureCount = counterCount(metricName, baseTags.and("outcome", "failure"));
        long totalCount = successCount + failureCount;

        return new AdminOperationsMetricsResponse.OperationSummary(
                successCount,
                failureCount,
                totalCount,
                toPercent(failureCount, totalCount)
        );
    }

    private AdminOperationsMetricsResponse.PredictionSummary buildPredictionSummary(String targetType) {
        long modelCount = counterCount(
                AI_PREDICTION_METRIC,
                Tags.of("targetType", normalizeTagValue(targetType, "unknown"), "outcome", "model")
        );
        long fallbackCount = counterCount(
                AI_PREDICTION_METRIC,
                Tags.of("targetType", normalizeTagValue(targetType, "unknown"), "outcome", "fallback")
        );
        long totalCount = modelCount + fallbackCount;

        return new AdminOperationsMetricsResponse.PredictionSummary(
                modelCount,
                fallbackCount,
                totalCount,
                toPercent(fallbackCount, totalCount)
        );
    }

    private void increment(String metricName, Tags tags) {
        Counter.builder(metricName)
                .tags(tags)
                .register(meterRegistry)
                .increment();
    }

    private long counterCount(String metricName, Tags tags) {
        Counter counter = meterRegistry.find(metricName).tags(tags).counter();
        if (counter == null) {
            return 0L;
        }
        return Math.round(counter.count());
    }

    private double toPercent(long numerator, long denominator) {
        if (denominator <= 0) {
            return 0.0;
        }
        return Math.round(((numerator * 1000.0) / denominator)) / 10.0;
    }

    private String normalizeTagValue(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }

        String normalized = value.trim().toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9_\\-]", "_");
        return normalized.isBlank() ? fallback : normalized;
    }
}
