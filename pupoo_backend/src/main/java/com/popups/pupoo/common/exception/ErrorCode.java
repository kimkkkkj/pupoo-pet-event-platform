// file: src/main/java/com/popups/pupoo/common/exception/ErrorCode.java
package com.popups.pupoo.common.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    // =========================
    // Common - 400
    // =========================
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "C4000", "Invalid request"),
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "C4001", "Validation failed"),

    // =========================
    // Common - 401/403
    // =========================
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "C4010", "Unauthorized"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "C4030", "Forbidden"),

    // =========================
    // Common - 404
    // =========================
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "C4040", "Resource not found"),

    // =========================
    // Common - 409
    // =========================
    DUPLICATE_RESOURCE(HttpStatus.CONFLICT, "C4090", "Duplicate resource"),

    // =========================
    // Common - 500
    // =========================
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "C5000", "Internal server error"),

    // =========================
    // Booth - 404
    // =========================
    BOOTH_NOT_FOUND(HttpStatus.NOT_FOUND, "B4041", "Booth not found"),

    // =========================
    // Event Registration - 400/403/404/409
    // =========================
    EVENT_NOT_FOUND(HttpStatus.NOT_FOUND, "E4041", "Event not found"),
    EVENT_REGISTRATION_NOT_FOUND(HttpStatus.NOT_FOUND, "E4042", "Event registration not found"),
    EVENT_REGISTRATION_DUPLICATE(HttpStatus.CONFLICT, "E4091", "Event registration already exists"),
    EVENT_REGISTRATION_INVALID_STATUS(HttpStatus.CONFLICT, "E4092", "Event registration status transition not allowed"),
    EVENT_REGISTRATION_ACCESS_DENIED(HttpStatus.FORBIDDEN, "E4031", "No permission for this registration"),
    EVENT_NOT_APPLICABLE(HttpStatus.CONFLICT, "E4093", "Event is not applicable"),

    // =========================
    // Program Apply - 400/403/404/409
    // =========================
    PROGRAM_NOT_FOUND(HttpStatus.NOT_FOUND, "G4041", "Program not found"),
    PROGRAM_APPLY_NOT_FOUND(HttpStatus.NOT_FOUND, "G4042", "Program apply not found"),
    PROGRAM_APPLY_DUPLICATE(HttpStatus.CONFLICT, "G4091", "Program apply already exists"),
    PROGRAM_APPLY_TIME_CLOSED(HttpStatus.CONFLICT, "G4092", "Program apply time closed"),
    PROGRAM_APPLY_INVALID_STATUS(HttpStatus.CONFLICT, "G4093", "Program apply status transition not allowed"),
    PROGRAM_APPLY_ACCESS_DENIED(HttpStatus.FORBIDDEN, "G4031", "No permission for this apply"),
    PROGRAM_APPLY_EVENT_NOT_APPLICABLE(HttpStatus.CONFLICT, "G4094", "Event is not applicable"),

    // =========================
    // QR - 404/409/410
    // =========================
    QR_NOT_FOUND(HttpStatus.NOT_FOUND, "Q4041", "QR not found"),
    QR_CHECK_CONFLICT(HttpStatus.CONFLICT, "Q4091", "QR check state conflict"),
    QR_EXPIRED(HttpStatus.GONE, "Q4100", "QR expired"),

    // =========================
    // Auth - 401
    // =========================
    USER_NOT_FOUND(HttpStatus.UNAUTHORIZED, "A4011", "User not found"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "A4012", "Invalid credentials"),
    REFRESH_TOKEN_MISSING(HttpStatus.UNAUTHORIZED, "A4013", "Refresh token missing"),
    REFRESH_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "A4014", "Refresh token invalid"),
    JWT_INVALID(HttpStatus.UNAUTHORIZED, "A4015", "JWT invalid"),

    // 사용자 상태
    USER_STATUS_INVALID(HttpStatus.UNAUTHORIZED, "A4020", "Invalid user status"),
    USER_INACTIVE(HttpStatus.FORBIDDEN, "A4033", "Inactive user"),
    USER_SUSPENDED(HttpStatus.FORBIDDEN, "A4034", "Suspended user"),

    // =========================
    // Auth - Verification (Email)
    // =========================
    EMAIL_ALREADY_VERIFIED(HttpStatus.BAD_REQUEST, "A4006", "Email already verified"),
    EMAIL_VERIFICATION_TOKEN_INVALID(HttpStatus.BAD_REQUEST, "A4007", "Invalid email verification token"),
    EMAIL_VERIFICATION_TOKEN_EXPIRED(HttpStatus.BAD_REQUEST, "A4008", "Email verification token expired"),
    PASSWORD_RESET_TOKEN_INVALID(HttpStatus.BAD_REQUEST, "A4021", "Invalid password reset code"),
    PASSWORD_RESET_TOKEN_EXPIRED(HttpStatus.BAD_REQUEST, "A4022", "Password reset code expired"),
    VERIFICATION_TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS, "A4291", "Too many verification requests"),

    // =========================
    // Auth - Verification (Phone)
    // =========================
    PHONE_ALREADY_VERIFIED(HttpStatus.BAD_REQUEST, "A4009", "Phone already verified"),
    PHONE_OTP_INVALID(HttpStatus.BAD_REQUEST, "A4016", "Invalid phone OTP"),
    PHONE_OTP_EXPIRED(HttpStatus.BAD_REQUEST, "A4017", "Phone OTP expired"),
    PHONE_OTP_TOO_MANY_ATTEMPTS(HttpStatus.BAD_REQUEST, "A4018", "Too many OTP attempts"),
    SMS_DISABLED(HttpStatus.SERVICE_UNAVAILABLE, "A5031", "SMS delivery is disabled"),
    SMS_PHONE_NUMBER_INVALID(HttpStatus.BAD_REQUEST, "A40010", "Invalid SMS phone number format"),
    SMS_OTP_NOT_FOUND(HttpStatus.NOT_FOUND, "A40410", "SMS OTP request not found"),
    SMS_OTP_MISMATCH(HttpStatus.BAD_REQUEST, "A40011", "SMS OTP does not match"),
    SMS_OTP_COOLDOWN(HttpStatus.TOO_MANY_REQUESTS, "A4297", "SMS OTP resend cooldown"),
    SMS_OTP_VERIFY_BLOCKED(HttpStatus.TOO_MANY_REQUESTS, "A4295", "SMS OTP verification blocked"),
    SMS_OTP_REQUEST_LIMIT(HttpStatus.TOO_MANY_REQUESTS, "A4296", "SMS OTP request limit exceeded"),
    SMS_SEND_FAILED(HttpStatus.BAD_GATEWAY, "A5021", "SMS send failed"),
    REDIS_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "A5032", "Redis is unavailable"),

    // =========================
    // Auth - Signup Session
    // =========================
    SIGNUP_SESSION_NOT_FOUND(HttpStatus.NOT_FOUND, "A4049", "Signup session not found"),
    SIGNUP_SESSION_EXPIRED(HttpStatus.GONE, "A4101", "Signup session expired"),
    SIGNUP_OTP_COOLDOWN(HttpStatus.TOO_MANY_REQUESTS, "A4292", "OTP cooldown"),
    SIGNUP_OTP_DAILY_LIMIT(HttpStatus.TOO_MANY_REQUESTS, "A4293", "OTP daily limit exceeded"),
    SIGNUP_OTP_BLOCKED(HttpStatus.TOO_MANY_REQUESTS, "A4294", "OTP verification blocked"),
    SIGNUP_NOT_OTP_VERIFIED(HttpStatus.CONFLICT, "A4091", "OTP not verified"),
    SIGNUP_EMAIL_NOT_VERIFIED(HttpStatus.CONFLICT, "A4092", "Email not verified"),
    SIGNUP_EMAIL_TOO_MANY_ATTEMPTS(HttpStatus.BAD_REQUEST, "A4019", "Too many email verification attempts"),

    // =========================
    // User - 404/409
    // =========================
    USER_PROFILE_NOT_FOUND(HttpStatus.NOT_FOUND, "U4041", "User profile not found"),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "U4091", "Email already exists"),
    DUPLICATE_NICKNAME(HttpStatus.CONFLICT, "U4092", "Nickname already exists"),
    DUPLICATE_PHONE(HttpStatus.CONFLICT, "U4093", "Phone already exists"),

    // =========================
    // User SocialAccount
    // =========================
    SOCIAL_ACCOUNT_NOT_FOUND(HttpStatus.NOT_FOUND, "U4042", "Social account not found"),
    SOCIAL_ACCOUNT_DUPLICATE_PROVIDER(HttpStatus.CONFLICT, "U4094", "Social account already linked for this provider"),
    SOCIAL_ACCOUNT_DUPLICATE_PROVIDER_UID(HttpStatus.CONFLICT, "U4095", "Social UID already linked"),
    SOCIAL_ACCOUNT_PROVIDER_UID_CONFLICT(HttpStatus.CONFLICT, "U4096", "Social UID is linked to another user"),
    SOCIAL_ACCOUNT_PROVIDER_MISMATCH(HttpStatus.BAD_REQUEST, "U4002", "Provider mismatch"),

    // =========================
    // Pet - 404/403
    // =========================
    PET_NOT_FOUND(HttpStatus.NOT_FOUND, "T4041", "Pet not found"),
    PET_ACCESS_DENIED(HttpStatus.FORBIDDEN, "T4031", "No permission for this pet"),

    // =========================
    // Interest - 404/409
    // =========================
    INTEREST_NOT_FOUND(HttpStatus.NOT_FOUND, "I4041", "Interest not found"),
    SUBSCRIPTION_NOT_FOUND(HttpStatus.NOT_FOUND, "I4042", "Subscription not found"),
    SUBSCRIPTION_DUPLICATE(HttpStatus.CONFLICT, "I4091", "Subscription already exists"),

    // =========================
    // Payment - 409
    // =========================
    PAYMENT_DUPLICATE_ACTIVE(HttpStatus.CONFLICT, "P4091", "Payment already in progress"),
    PAYMENT_INVALID_STATUS(HttpStatus.CONFLICT, "P4092", "Payment status transition not allowed"),
    PAYMENT_TX_ALREADY_EXISTS(HttpStatus.CONFLICT, "P4093", "Payment transaction already exists"),
    PAYMENT_TX_INVALID_STATUS(HttpStatus.CONFLICT, "P4094", "Payment transaction status invalid"),
    PAYMENT_TX_NOT_FOUND(HttpStatus.NOT_FOUND, "P4041", "Payment transaction not found"),
    PAYMENT_PG_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "P5001", "Payment gateway error"),

    // =========================
    // Contest Vote - 400/403/404/409
    // =========================
    CONTEST_NOT_CONTEST(HttpStatus.BAD_REQUEST, "V4001", "Program is not a contest"),
    CONTEST_APPLY_NOT_MATCHED(HttpStatus.BAD_REQUEST, "V4002", "Program apply does not match program"),
    CONTEST_TARGET_INVALID(HttpStatus.BAD_REQUEST, "V4003", "Invalid vote target"),
    CONTEST_CANNOT_VOTE_SELF(HttpStatus.FORBIDDEN, "V4031", "내 반려동물에게는 투표할 수 없어요 🐾"),
    CONTEST_VOTE_NOT_FOUND(HttpStatus.NOT_FOUND, "V4041", "Vote not found"),
    CONTEST_VOTE_ALREADY(HttpStatus.CONFLICT, "V4091", "이미 투표하셨어요! 한 번만 투표할 수 있답니다 🗳️"),
    CONTEST_VOTE_PERIOD_CLOSED(HttpStatus.CONFLICT, "V4092", "투표 기간이 아니에요 ⏰"),

    // =========================
    // Refund - 400/403/404/409/500
    // =========================
    REFUND_FULL_ONLY(HttpStatus.BAD_REQUEST, "R4001", "Only full refunds are allowed"),
    REFUND_ACCESS_DENIED(HttpStatus.FORBIDDEN, "R4031", "No permission for this refund/payment"),
    REFUND_NOT_FOUND(HttpStatus.NOT_FOUND, "R4041", "Refund not found"),
    PAYMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "R4042", "Payment not found"),
    REFUND_ALREADY_EXISTS(HttpStatus.CONFLICT, "R4091", "Refund already exists for this payment"),
    REFUND_INVALID_STATUS(HttpStatus.CONFLICT, "R4092", "Refund status transition not allowed"),
    REFUND_NOT_ALLOWED(HttpStatus.CONFLICT, "R4093", "Refund not allowed in current payment state"),
    REFUND_PG_CANCEL_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "R5001", "PG cancel failed");

    private final HttpStatus status;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }
}
