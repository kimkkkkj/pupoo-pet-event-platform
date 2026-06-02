package com.popups.pupoo.auth.infrastructure.sms;

import com.popups.pupoo.auth.config.AwsMessagingProperties;
import com.popups.pupoo.auth.port.SmsOtpSenderPort;
import com.popups.pupoo.auth.support.KoreanPhoneNumberNormalizer;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.MessageAttributeValue;
import software.amazon.awssdk.services.sns.model.PublishRequest;
import software.amazon.awssdk.services.sns.model.PublishResponse;
import software.amazon.awssdk.services.sns.model.SnsException;

import java.util.HashMap;
import java.util.Map;

public class AwsSnsSmsOtpSender implements SmsOtpSenderPort {

    private static final Logger log = LoggerFactory.getLogger(AwsSnsSmsOtpSender.class);

    private final String provider;
    private final SnsClient snsClient;
    private final AwsMessagingProperties awsMessagingProperties;
    private final boolean enabled;

    public AwsSnsSmsOtpSender(
            String provider,
            SnsClient snsClient,
            AwsMessagingProperties awsMessagingProperties,
            boolean enabled
    ) {
        this.provider = provider;
        this.snsClient = snsClient;
        this.awsMessagingProperties = awsMessagingProperties;
        this.enabled = enabled;
    }

    @Override
    public void sendOtp(String phone, String message) {
        if (!enabled) {
            throw new BusinessException(ErrorCode.SMS_DISABLED, "SMS 발송이 비활성화되어 있습니다.");
        }

        String normalizedPhone = KoreanPhoneNumberNormalizer.normalizeToE164(phone);
        String maskedPhone = maskPhone(normalizedPhone);
        String smsRegion = awsMessagingProperties.getSms() != null ? awsMessagingProperties.getSms().getRegion() : null;

        try {
            PublishRequest publishRequest = PublishRequest.builder()
                    .phoneNumber(normalizedPhone)
                    .message(message)
                    .messageAttributes(buildMessageAttributes())
                    .build();
            PublishResponse response = snsClient.publish(publishRequest);

            log.info(
                    "[AUTH_SMS_PROVIDER={}] SNS sms sent. phone={}, region={}, messageId={}",
                    provider,
                    maskedPhone,
                    blankToPlaceholder(smsRegion),
                    blankToPlaceholder(response.messageId())
            );
        } catch (SnsException | SdkClientException e) {
            log.error(
                    "[AUTH_SMS_PROVIDER={}] SNS sms failed. phone={}, region={}, reason={}",
                    provider,
                    maskedPhone,
                    blankToPlaceholder(smsRegion),
                    e.getMessage(),
                    e
            );
            throw new BusinessException(ErrorCode.SMS_SEND_FAILED, "인증번호 문자 발송에 실패했습니다.");
        }
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

    private String blankToPlaceholder(String value) {
        return value != null && !value.isBlank() ? value : "<empty>";
    }

    private Map<String, MessageAttributeValue> buildMessageAttributes() {
        Map<String, MessageAttributeValue> attributes = new HashMap<>();

        AwsMessagingProperties.Sms sms = awsMessagingProperties.getSms();
        if (sms == null) {
            return attributes;
        }

        putStringAttribute(attributes, "AWS.SNS.SMS.OriginationNumber", sms.getOriginationNumber());
        putStringAttribute(attributes, "AWS.SNS.SMS.SenderID", sms.getSenderId());
        return attributes;
    }

    private void putStringAttribute(Map<String, MessageAttributeValue> attributes, String key, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        attributes.put(
                key,
                MessageAttributeValue.builder()
                        .dataType("String")
                        .stringValue(value.trim())
                        .build()
        );
    }
}
