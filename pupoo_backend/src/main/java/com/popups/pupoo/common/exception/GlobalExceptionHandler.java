// file: src/main/java/com/popups/pupoo/common/exception/GlobalExceptionHandler.java
package com.popups.pupoo.common.exception;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.ErrorResponse;
import com.popups.pupoo.common.api.FieldErrorItem;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private static final String UK_USERS_EMAIL = "uk_users_email";
    private static final String UK_USERS_PHONE = "uk_users_phone";
    private static final String UK_USERS_NICKNAME = "uk_users_nickname";
    private static final String UK_PAYMENTS_EVENT_USER_ACTIVE = "uk_payments_event_user_active";
    private static final String UK_REFUNDS_PAYMENT_ID = "uk_refunds_payment_id";
    private static final String UK_CONTEST_VOTES_ACTIVE = "uk_contest_votes_active";
    private static final String UK_PAYMENT_TX_PAYMENT_ID = "uk_payment_transactions_payment_id";
    private static final String UK_PAYMENT_TX_PROVIDER_TID = "uk_payment_transactions_provider_tid";
    private static final String UK_PAYMENTS_ORDER_NO = "uk_payments_order_no";

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException e, HttpServletRequest request) {
        ErrorCode ec = e.getErrorCode();
        String msg = e.getMessage();
        if (msg == null || msg.isBlank()) {
            msg = ec.getMessage();
        }
        logHandledException(request, ec, msg);
        ErrorResponse body = new ErrorResponse(ec.getCode(), msg, ec.getStatus().value(), request.getRequestURI());
        return ResponseEntity.status(ec.getStatus())
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .body(ApiResponse.fail(body));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e, HttpServletRequest request) {
        String msg = "Validation failed";
        FieldError fe = e.getBindingResult().getFieldError();
        if (fe != null) {
            msg = fe.getField() + ": " + fe.getDefaultMessage();
        }

        ErrorResponse body = new ErrorResponse(
                ErrorCode.VALIDATION_FAILED.getCode(),
                msg,
                ErrorCode.VALIDATION_FAILED.getStatus().value(),
                request.getRequestURI()
        );

        body.setFieldErrors(
                e.getBindingResult().getFieldErrors().stream()
                        .map(err -> new FieldErrorItem(err.getField(), err.getDefaultMessage()))
                        .toList()
        );
        logHandledException(request, ErrorCode.VALIDATION_FAILED, msg);
        return ResponseEntity.status(ErrorCode.VALIDATION_FAILED.getStatus())
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .body(ApiResponse.fail(body));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadableBody(
            HttpMessageNotReadableException e,
            HttpServletRequest request
    ) {
        String msg = "Request body is invalid";
        Throwable cause = e.getMostSpecificCause();
        if (cause != null && cause.getMessage() != null && !cause.getMessage().isBlank()) {
            msg = cause.getMessage();
        }

        logHandledException(request, ErrorCode.VALIDATION_FAILED, msg);
        return build(request, ErrorCode.VALIDATION_FAILED, ErrorCode.VALIDATION_FAILED.getStatus(), msg);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingParam(
            MissingServletRequestParameterException e,
            HttpServletRequest request
    ) {
        String msg = e.getParameterName() + ": is required";
        return build(request, ErrorCode.VALIDATION_FAILED, ErrorCode.VALIDATION_FAILED.getStatus(), msg);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(
            MethodArgumentTypeMismatchException e,
            HttpServletRequest request
    ) {
        String msg = e.getName() + ": type mismatch";
        return build(request, ErrorCode.VALIDATION_FAILED, ErrorCode.VALIDATION_FAILED.getStatus(), msg);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrity(
            DataIntegrityViolationException e,
            HttpServletRequest request
    ) {
        String root = rootMessage(e);
        String lower = (root == null) ? "" : root.toLowerCase();

        if (lower.contains(UK_USERS_EMAIL)) {
            ErrorCode ec = ErrorCode.DUPLICATE_EMAIL;
            return build(request, ec, ec.getStatus(), "이미 가입된 이메일입니다.");
        }

        if (lower.contains(UK_USERS_PHONE)) {
            ErrorCode ec = ErrorCode.DUPLICATE_PHONE;
            return build(request, ec, ec.getStatus(), "이미 가입된 전화번호입니다.");
        }

        if (lower.contains(UK_USERS_NICKNAME)) {
            ErrorCode ec = ErrorCode.DUPLICATE_NICKNAME;
            return build(request, ec, ec.getStatus(), "이미 사용 중인 닉네임입니다.");
        }

        if (lower.contains(UK_PAYMENTS_EVENT_USER_ACTIVE)) {
            ErrorCode ec = ErrorCode.PAYMENT_DUPLICATE_ACTIVE;
            return build(request, ec, ec.getStatus(), ec.getMessage());
        }

        if (lower.contains(UK_REFUNDS_PAYMENT_ID)) {
            ErrorCode ec = ErrorCode.REFUND_ALREADY_EXISTS;
            return build(request, ec, ec.getStatus(), ec.getMessage());
        }

        if (lower.contains(UK_CONTEST_VOTES_ACTIVE)) {
            ErrorCode ec = ErrorCode.CONTEST_VOTE_ALREADY;
            return build(request, ec, ec.getStatus(), ec.getMessage());
        }

        if (lower.contains(UK_PAYMENT_TX_PAYMENT_ID) || lower.contains(UK_PAYMENT_TX_PROVIDER_TID)) {
            ErrorCode ec = ErrorCode.PAYMENT_TX_ALREADY_EXISTS;
            return build(request, ec, ec.getStatus(), ec.getMessage());
        }

        if (lower.contains(UK_PAYMENTS_ORDER_NO)) {
            ErrorCode ec = ErrorCode.DUPLICATE_RESOURCE;
            return build(request, ec, ec.getStatus(), "Duplicate order_no");
        }

        if (lower.contains("duplicate entry")) {
            ErrorCode ec = ErrorCode.DUPLICATE_RESOURCE;
            return build(request, ec, ec.getStatus(), "Duplicate entry");
        }

        return build(request, ErrorCode.INVALID_REQUEST, HttpStatus.BAD_REQUEST, "DATA_INTEGRITY_VIOLATION");
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalState(IllegalStateException e, HttpServletRequest request) {
        String key = (e.getMessage() == null) ? "" : e.getMessage();

        if ("UNAUTHENTICATED".equals(key) || "INVALID_PRINCIPAL".equals(key)) {
            return build(request, ErrorCode.UNAUTHORIZED, ErrorCode.UNAUTHORIZED.getStatus(), key);
        }
        if ("QR_EXPIRED".equals(key)) {
            return build(request, ErrorCode.QR_EXPIRED, ErrorCode.QR_EXPIRED.getStatus(), key);
        }
        if ("ALREADY_CHECKED_IN".equals(key)
                || "ALREADY_CHECKED_OUT".equals(key)
                || "CHECKOUT_REQUIRES_CHECKIN".equals(key)
                || "ALREADY_IN_SAME_STATE".equals(key)) {
            return build(request, ErrorCode.QR_CHECK_CONFLICT, ErrorCode.QR_CHECK_CONFLICT.getStatus(), key);
        }

        return build(
                request,
                ErrorCode.INTERNAL_ERROR,
                ErrorCode.INTERNAL_ERROR.getStatus(),
                ErrorCode.INTERNAL_ERROR.getMessage()
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArg(IllegalArgumentException e, HttpServletRequest request) {
        String key = (e.getMessage() == null) ? "" : e.getMessage();

        if ("QR_NOT_FOUND".equals(key)) {
            return build(request, ErrorCode.QR_NOT_FOUND, ErrorCode.QR_NOT_FOUND.getStatus(), key);
        }
        if ("BOOTH_NOT_FOUND".equals(key)) {
            return build(request, ErrorCode.BOOTH_NOT_FOUND, ErrorCode.BOOTH_NOT_FOUND.getStatus(), key);
        }
        if ("EVENT_NOT_FOUND".equals(key)) {
            return build(request, ErrorCode.RESOURCE_NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND.getStatus(), key);
        }

        return build(request, ErrorCode.INVALID_REQUEST, ErrorCode.INVALID_REQUEST.getStatus(), key);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnknown(Exception e, HttpServletRequest request) {
        log.error("Unhandled exception: method={} uri={}", request.getMethod(), request.getRequestURI(), e);
        ErrorResponse body = new ErrorResponse(
                ErrorCode.INTERNAL_ERROR.getCode(),
                ErrorCode.INTERNAL_ERROR.getMessage(),
                ErrorCode.INTERNAL_ERROR.getStatus().value(),
                request.getRequestURI()
        );
        return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.getStatus())
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .body(ApiResponse.fail(body));
    }

    private ResponseEntity<ApiResponse<Void>> build(HttpServletRequest request, ErrorCode ec, HttpStatus status, String msg) {
        logHandledException(request, ec, msg);
        ErrorResponse body = new ErrorResponse(ec.getCode(), msg, status.value(), request.getRequestURI());
        return ResponseEntity.status(status)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .body(ApiResponse.fail(body));
    }

    private void logHandledException(HttpServletRequest request, ErrorCode ec, String msg) {
        log.warn("Handled exception: method={} uri={} code={} status={} message={}",
                request.getMethod(),
                request.getRequestURI(),
                ec.getCode(),
                ec.getStatus().value(),
                msg);
    }

    private String rootMessage(Throwable t) {
        Throwable cur = t;
        while (cur.getCause() != null) {
            cur = cur.getCause();
        }
        return cur.getMessage();
    }
}
