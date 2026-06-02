package com.popups.pupoo.auth.infrastructure.email;

import com.popups.pupoo.auth.config.AwsMessagingProperties;
import com.popups.pupoo.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.sesv2.SesV2Client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class AwsSesEmailVerificationSenderTest {

    @Test
    void sendVerificationEmailRequiresFromAddress() {
        AwsMessagingProperties properties = new AwsMessagingProperties();
        AwsSesEmailVerificationSender sender = new AwsSesEmailVerificationSender(
                "aws-ses",
                mock(SesV2Client.class),
                properties,
                ""
        );

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> sender.sendVerificationEmail("user@example.com", "123456")
        );

        assertEquals("AWS SES 발신 주소 설정이 필요합니다.", exception.getMessage());
    }

    @Test
    void sendAccountVerificationEmailRequiresBaseUrl() {
        AwsMessagingProperties properties = new AwsMessagingProperties();
        properties.getSes().setFromAddress("no-reply@example.com");
        AwsSesEmailVerificationSender sender = new AwsSesEmailVerificationSender(
                "aws-ses",
                mock(SesV2Client.class),
                properties,
                ""
        );

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> sender.sendAccountVerificationEmail("user@example.com", "token")
        );

        assertEquals("이메일 인증 기본 URL 설정이 필요합니다.", exception.getMessage());
    }
}
