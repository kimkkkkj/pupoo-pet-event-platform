// file: src/main/java/com/popups/pupoo/interest/dto/InterestSubscribeRequest.java
package com.popups.pupoo.interest.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class InterestSubscribeRequest {

    @NotNull
    private Long interestId;

    /**
     * 채널 수신 동의
     * - DB: TINYINT NOT NULL
     * - 기본값 정책: inapp=true, email/sms=false (MVP)
     */
    private Boolean allowInapp = true;
    private Boolean allowEmail = false;
    private Boolean allowSms = false;

    public boolean allowInappValue() { return allowInapp != null && allowInapp; }
    public boolean allowEmailValue() { return allowEmail != null && allowEmail; }
    public boolean allowSmsValue() { return allowSms != null && allowSms; }
}
