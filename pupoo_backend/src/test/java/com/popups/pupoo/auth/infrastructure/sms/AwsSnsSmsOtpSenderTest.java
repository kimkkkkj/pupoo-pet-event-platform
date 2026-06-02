package com.popups.pupoo.auth.infrastructure.sms;

import com.popups.pupoo.auth.config.AwsMessagingProperties;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.PublishRequest;
import software.amazon.awssdk.services.sns.model.PublishResponse;
import software.amazon.awssdk.services.sns.model.SnsException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AwsSnsSmsOtpSenderTest {

    @Test
    void publishesNormalizedPhoneNumberWithConfiguredMessageAttributes() {
        SnsClient snsClient = mock(SnsClient.class);
        when(snsClient.publish(any(PublishRequest.class)))
                .thenReturn(PublishResponse.builder().messageId("message-1").build());

        AwsMessagingProperties properties = new AwsMessagingProperties();
        properties.getSms().setRegion("ap-northeast-2");
        properties.getSms().setOriginationNumber("+821012345678");
        properties.getSms().setSenderId("PUPOO");
        AwsSnsSmsOtpSender sender = new AwsSnsSmsOtpSender("aws-sns", snsClient, properties, true);

        sender.sendOtp("01012345678", "[PUPOO] OTP 123456");

        ArgumentCaptor<PublishRequest> captor = ArgumentCaptor.forClass(PublishRequest.class);
        verify(snsClient).publish(captor.capture());
        assertEquals("+821012345678", captor.getValue().phoneNumber());
        assertEquals(
                "+821012345678",
                captor.getValue().messageAttributes().get("AWS.SNS.SMS.OriginationNumber").stringValue()
        );
        assertEquals(
                "PUPOO",
                captor.getValue().messageAttributes().get("AWS.SNS.SMS.SenderID").stringValue()
        );
    }

    @Test
    void omitsBlankMessageAttributes() {
        SnsClient snsClient = mock(SnsClient.class);
        when(snsClient.publish(any(PublishRequest.class)))
                .thenReturn(PublishResponse.builder().messageId("message-1").build());

        AwsMessagingProperties properties = new AwsMessagingProperties();
        properties.getSms().setRegion("ap-northeast-2");
        AwsSnsSmsOtpSender sender = new AwsSnsSmsOtpSender("aws-sns", snsClient, properties, true);

        sender.sendOtp("01012345678", "[PUPOO] OTP 123456");

        ArgumentCaptor<PublishRequest> captor = ArgumentCaptor.forClass(PublishRequest.class);
        verify(snsClient).publish(captor.capture());
        assertTrue(captor.getValue().messageAttributes() == null || captor.getValue().messageAttributes().isEmpty());
    }

    @Test
    void rejectsInvalidPhoneNumber() {
        AwsSnsSmsOtpSender sender = new AwsSnsSmsOtpSender(
                "aws-sns",
                mock(SnsClient.class),
                new AwsMessagingProperties(),
                true
        );

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> sender.sendOtp("12345", "[PUPOO] OTP 123456")
        );

        assertEquals(ErrorCode.SMS_PHONE_NUMBER_INVALID, exception.getErrorCode());
    }

    @Test
    void wrapsAwsFailureAsBusinessException() {
        SnsClient snsClient = mock(SnsClient.class);
        when(snsClient.publish(any(PublishRequest.class)))
                .thenThrow(SnsException.builder().message("publish failed").build());

        AwsSnsSmsOtpSender sender = new AwsSnsSmsOtpSender(
                "aws-sns",
                snsClient,
                new AwsMessagingProperties(),
                true
        );

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> sender.sendOtp("01012345678", "[PUPOO] OTP 123456")
        );

        assertEquals(ErrorCode.SMS_SEND_FAILED, exception.getErrorCode());
    }
}
