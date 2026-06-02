package com.popups.pupoo.auth.support;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;

public final class KoreanPhoneNumberNormalizer {

    private KoreanPhoneNumberNormalizer() {
    }

    public static String normalizeToE164(String rawPhoneNumber) {
        if (rawPhoneNumber == null || rawPhoneNumber.isBlank()) {
            throw new BusinessException(ErrorCode.SMS_PHONE_NUMBER_INVALID, "전화번호를 입력해 주세요.");
        }

        String sanitized = rawPhoneNumber.replaceAll("[^0-9+]", "");
        if (sanitized.isBlank()) {
            throw new BusinessException(ErrorCode.SMS_PHONE_NUMBER_INVALID, "전화번호 형식이 올바르지 않습니다.");
        }

        String digits;
        if (sanitized.startsWith("+")) {
            if (!sanitized.startsWith("+82")) {
                throw new BusinessException(ErrorCode.SMS_PHONE_NUMBER_INVALID, "한국 휴대전화 번호만 지원합니다.");
            }
            digits = sanitized.substring(1);
        } else {
            digits = sanitized;
        }

        if (digits.startsWith("0")) {
            digits = "82" + digits.substring(1);
        }

        if (!digits.startsWith("82")) {
            throw new BusinessException(ErrorCode.SMS_PHONE_NUMBER_INVALID, "한국 국가번호(+82)가 필요합니다.");
        }

        String nationalNumber = digits.substring(2);
        if (!isSupportedMobileNumber(nationalNumber)) {
            throw new BusinessException(ErrorCode.SMS_PHONE_NUMBER_INVALID, "지원하지 않는 휴대전화 번호 형식입니다.");
        }

        return "+" + digits;
    }

    private static boolean isSupportedMobileNumber(String nationalNumber) {
        if (nationalNumber == null) {
            return false;
        }
        if (nationalNumber.length() < 9 || nationalNumber.length() > 10) {
            return false;
        }
        if (!nationalNumber.matches("\\d+")) {
            return false;
        }
        return nationalNumber.startsWith("10")
                || nationalNumber.startsWith("11")
                || nationalNumber.startsWith("16")
                || nationalNumber.startsWith("17")
                || nationalNumber.startsWith("18")
                || nationalNumber.startsWith("19");
    }
}
