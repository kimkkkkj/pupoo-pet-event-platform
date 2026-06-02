// file: src/main/java/com/popups/pupoo/payment/port/PaymentGateway.java
package com.popups.pupoo.payment.port;

import com.popups.pupoo.payment.domain.model.Payment;
import com.popups.pupoo.payment.dto.PaymentApproveRequest;
import com.popups.pupoo.payment.dto.PaymentReadyRequest;
import com.popups.pupoo.payment.dto.PaymentReadyResponse;

public interface PaymentGateway {

    PaymentReadyResponse ready(Payment payment, PaymentReadyRequest req);

    boolean approve(Payment payment, PaymentApproveRequest req);

    boolean cancel(Payment payment);
}
