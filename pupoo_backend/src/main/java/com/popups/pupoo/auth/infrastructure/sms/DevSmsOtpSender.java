package com.popups.pupoo.auth.infrastructure.sms;

import com.popups.pupoo.auth.port.SmsOtpSenderPort;
import com.popups.pupoo.auth.support.KoreanPhoneNumberNormalizer;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DevSmsOtpSender implements SmsOtpSenderPort {

    private static final Logger log = LoggerFactory.getLogger(DevSmsOtpSender.class);

    private final String provider;
    private final boolean enabled;

    public DevSmsOtpSender(String provider, boolean enabled) {
        this.provider = provider;
        this.enabled = enabled;
    }

    @Override
    public void sendOtp(String phone, String message) {
        if (!enabled) {
            throw new BusinessException(ErrorCode.SMS_DISABLED, "SMS 발송이 비활성화되어 있습니다.");
        }

        String normalizedPhone = KoreanPhoneNumberNormalizer.normalizeToE164(phone);
        log.info("[AUTH_SMS_PROVIDER={}] sms otp phone={}, message=<masked>", provider, maskPhone(normalizedPhone));
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return "<empty>";
        }
        if (phone.length() <= 4) {
            return "***";
        }
        return phone.substring(0, Math.min(3, phone.length())) + "****" + phone.substring(phone.length() - 2);
    }
}
