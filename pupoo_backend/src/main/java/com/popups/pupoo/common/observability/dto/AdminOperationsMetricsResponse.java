package com.popups.pupoo.common.observability.dto;

import java.time.LocalDateTime;

public record AdminOperationsMetricsResponse(
        String scope,
        String instanceId,
        LocalDateTime capturedAt,
        AuthMetrics auth,
        PaymentMetrics payment,
        AiMetrics ai,
        NotificationSseMetrics notificationSse
) {

    public record AuthMetrics(
            OperationSummary signupStart,
            OperationSummary signupComplete,
            OperationSummary passwordLogin,
            OperationSummary socialLogin,
            OperationSummary signupLogin,
            OperationSummary refresh
    ) {
    }

    public record PaymentMetrics(
            OperationSummary ready,
            OperationSummary approve,
            OperationSummary cancel
    ) {
    }

    public record AiMetrics(
            PredictionSummary eventPrediction,
            PredictionSummary programPrediction
    ) {
    }

    public record NotificationSseMetrics(
            long connectCount,
            long reconnectCount,
            long completedDisconnectCount,
            long timeoutDisconnectCount,
            long errorDisconnectCount,
            long sendFailureDisconnectCount,
            long activeConnectionCount
    ) {
        public long totalDisconnectCount() {
            return completedDisconnectCount
                    + timeoutDisconnectCount
                    + errorDisconnectCount
                    + sendFailureDisconnectCount;
        }
    }

    public record OperationSummary(
            long successCount,
            long failureCount,
            long totalCount,
            double failureRatePercent
    ) {
    }

    public record PredictionSummary(
            long modelCount,
            long fallbackCount,
            long totalCount,
            double fallbackRatePercent
    ) {
    }
}
