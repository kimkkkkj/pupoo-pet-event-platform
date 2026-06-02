package com.popups.pupoo.auth.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 기능: AWS 인증 발송 연동 설정을 바인딩한다.
 * 설명: 리전, SES 발신자, SNS 발신 번호와 발신자 ID를 설정 기반으로 관리한다.
 * 흐름: config 계층에서 값을 주입받아 AWS 클라이언트와 발송 구현체가 사용한다.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "aws")
public class AwsMessagingProperties {

    private String region;
    private String accessKeyId;
    private String secretAccessKey;
    private String sessionToken;
    private Ses ses = new Ses();
    private Sms sms = new Sms();

    @Getter
    @Setter
    public static class Ses {
        private String fromAddress;
        private String fromName;
    }

    @Getter
    @Setter
    public static class Sms {
        private String region;
        private String originationNumber;
        private String senderId;
    }
}
