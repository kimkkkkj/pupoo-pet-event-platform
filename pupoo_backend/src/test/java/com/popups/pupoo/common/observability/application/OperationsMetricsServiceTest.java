package com.popups.pupoo.common.observability.application;

import com.popups.pupoo.common.observability.dto.AdminOperationsMetricsResponse;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OperationsMetricsServiceTest {

    @Test
    void buildSummaryAggregatesRuntimeCounters() {
        SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
        OperationsMetricsService service = new OperationsMetricsService(meterRegistry);

        service.recordSignupStartSuccess();
        service.recordSignupStartFailure("duplicate_phone");
        service.recordSignupCompleteSuccess();
        service.recordSignupCompleteFailure("duplicate_phone");
        service.recordLoginSuccess("password");
        service.recordLoginFailure("password", "invalid_credentials");
        service.recordLoginSuccess("social");
        service.recordRefreshSuccess();
        service.recordRefreshFailure("invalid_token");
        service.recordPaymentStageSuccess("ready", "kakaopay");
        service.recordPaymentStageFailure("approve", "kakaopay", "http_error");
        service.recordAiPrediction("event", false);
        service.recordAiPrediction("event", true);
        service.recordAiPrediction("program", false);
        service.recordSseConnect(false);
        service.recordSseConnect(true);
        service.recordSseDisconnect("completed");
        service.recordSseDisconnect("send_failure");

        AdminOperationsMetricsResponse summary = service.buildSummary("backend-0", 3);

        assertThat(summary.scope()).isEqualTo("pod");
        assertThat(summary.instanceId()).isEqualTo("backend-0");
        assertThat(summary.auth().signupStart().successCount()).isEqualTo(1);
        assertThat(summary.auth().signupStart().failureCount()).isEqualTo(1);
        assertThat(summary.auth().signupComplete().successCount()).isEqualTo(1);
        assertThat(summary.auth().signupComplete().failureCount()).isEqualTo(1);
        assertThat(summary.auth().passwordLogin().successCount()).isEqualTo(1);
        assertThat(summary.auth().passwordLogin().failureCount()).isEqualTo(1);
        assertThat(summary.auth().socialLogin().successCount()).isEqualTo(1);
        assertThat(summary.auth().refresh().failureCount()).isEqualTo(1);
        assertThat(summary.payment().ready().successCount()).isEqualTo(1);
        assertThat(summary.payment().approve().failureCount()).isEqualTo(1);
        assertThat(summary.ai().eventPrediction().fallbackCount()).isEqualTo(1);
        assertThat(summary.ai().eventPrediction().modelCount()).isEqualTo(1);
        assertThat(summary.ai().programPrediction().modelCount()).isEqualTo(1);
        assertThat(summary.notificationSse().connectCount()).isEqualTo(1);
        assertThat(summary.notificationSse().reconnectCount()).isEqualTo(1);
        assertThat(summary.notificationSse().completedDisconnectCount()).isEqualTo(1);
        assertThat(summary.notificationSse().sendFailureDisconnectCount()).isEqualTo(1);
        assertThat(summary.notificationSse().activeConnectionCount()).isEqualTo(3);
    }
}
