package com.popups.pupoo.payment.infrastructure;

import com.popups.pupoo.payment.domain.enums.PaymentProvider;
import com.popups.pupoo.payment.domain.model.Payment;
import com.popups.pupoo.payment.domain.model.PaymentTransaction;
import com.popups.pupoo.payment.dto.PaymentReadyRequest;
import com.popups.pupoo.payment.persistence.PaymentTransactionRepository;
import com.popups.pupoo.common.observability.application.OperationsMetricsService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class KakaoPayGatewayTest {

    @AfterEach
    void clearRequestContext() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void readyUsesCanonicalWwwCallbacksEvenWhenRefererUsesRootHost() {
        KakaoPayClient client = mock(KakaoPayClient.class);
        PaymentTransactionRepository txRepository = mock(PaymentTransactionRepository.class);
        KakaoPayProperties props = new KakaoPayProperties(
                "https://open-api.kakaopay.com",
                "DEV26TESTKEY",
                "SECRET_KEY ",
                "TC0ONETIME",
                "/online/v1/payment/ready",
                "/online/v1/payment/approve",
                "/online/v1/payment/cancel",
                "https://pupoo.site/payment/approve?paymentId={paymentId}}",
                "https://pupoo.site/payment/cancel?paymentId={paymentId}}",
                "https://pupoo.site/payment/fail?paymentId={paymentId}}"
        );

        when(txRepository.findLatestByPaymentIdForUpdate(any(), any())).thenReturn(List.of());
        when(client.ready(any())).thenReturn(new KakaoPayReadyResponse(
                "T123",
                "https://mock.pc",
                "https://mock.mobile",
                "2026-03-29T00:00:00"
        ));
        when(client.toJson(any())).thenReturn("{\"tid\":\"T123\"}");

        KakaoPayGateway gateway = new KakaoPayGateway(
                client,
                props,
                txRepository,
                new OperationsMetricsService(new SimpleMeterRegistry())
        );
        Payment payment = Payment.requested(8004L, 3L, 28208L, "PTESTORDER001", BigDecimal.valueOf(1000), PaymentProvider.KAKAOPAY);
        ReflectionTestUtils.setField(payment, "paymentId", 99001L);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Referer", "https://pupoo.site/payment/checkout?eventId=3");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        gateway.ready(payment, new PaymentReadyRequest("Pupoo 결제", 1, BigDecimal.valueOf(1000), 0));

        ArgumentCaptor<KakaoPayReadyRequest> requestCaptor = ArgumentCaptor.forClass(KakaoPayReadyRequest.class);
        verify(client).ready(requestCaptor.capture());
        KakaoPayReadyRequest readyRequest = requestCaptor.getValue();

        assertThat(readyRequest.approval_url()).isEqualTo("https://www.pupoo.site/payment/approve?paymentId=99001");
        assertThat(readyRequest.cancel_url()).isEqualTo("https://www.pupoo.site/payment/cancel?paymentId=99001");
        assertThat(readyRequest.fail_url()).isEqualTo("https://www.pupoo.site/payment/fail?paymentId=99001");
        verify(txRepository).save(any(PaymentTransaction.class));
    }

    @Test
    void readyFallsBackToCanonicalConfiguredUrlWithoutRequestContext() {
        KakaoPayClient client = mock(KakaoPayClient.class);
        PaymentTransactionRepository txRepository = mock(PaymentTransactionRepository.class);
        KakaoPayProperties props = new KakaoPayProperties(
                "https://open-api.kakaopay.com",
                "DEV26TESTKEY",
                "SECRET_KEY ",
                "TC0ONETIME",
                "/online/v1/payment/ready",
                "/online/v1/payment/approve",
                "/online/v1/payment/cancel",
                "https://pupoo.site/payment/approve?paymentId={paymentId",
                "https://pupoo.site/payment/cancel?paymentId={paymentId",
                "https://pupoo.site/payment/fail?paymentId={paymentId"
        );

        when(txRepository.findLatestByPaymentIdForUpdate(any(), any())).thenReturn(List.of());
        when(client.ready(any())).thenReturn(new KakaoPayReadyResponse(
                "T456",
                "https://mock.pc",
                "https://mock.mobile",
                "2026-03-29T00:00:00"
        ));
        when(client.toJson(any())).thenReturn("{\"tid\":\"T456\"}");

        KakaoPayGateway gateway = new KakaoPayGateway(
                client,
                props,
                txRepository,
                new OperationsMetricsService(new SimpleMeterRegistry())
        );
        Payment payment = Payment.requested(8004L, 3L, 28208L, "PTESTORDER002", BigDecimal.valueOf(1500), PaymentProvider.KAKAOPAY);
        ReflectionTestUtils.setField(payment, "paymentId", 99002L);

        gateway.ready(payment, new PaymentReadyRequest("Pupoo 결제", 1, BigDecimal.valueOf(1500), 0));

        ArgumentCaptor<KakaoPayReadyRequest> requestCaptor = ArgumentCaptor.forClass(KakaoPayReadyRequest.class);
        verify(client).ready(requestCaptor.capture());
        KakaoPayReadyRequest readyRequest = requestCaptor.getValue();

        assertThat(readyRequest.approval_url()).isEqualTo("https://www.pupoo.site/payment/approve?paymentId=99002");
        assertThat(readyRequest.cancel_url()).isEqualTo("https://www.pupoo.site/payment/cancel?paymentId=99002");
        assertThat(readyRequest.fail_url()).isEqualTo("https://www.pupoo.site/payment/fail?paymentId=99002");
    }
}
