package com.popups.pupoo.interest.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class InterestChannelUpdateRequest {

    @NotNull
    private Long interestId;

    @NotNull
    private Boolean allowInapp;

    @NotNull
    private Boolean allowEmail;

    @NotNull
    private Boolean allowSms;

    public boolean allowInappValue() {
        return Boolean.TRUE.equals(allowInapp);
    }

    public boolean allowEmailValue() {
        return Boolean.TRUE.equals(allowEmail);
    }

    public boolean allowSmsValue() {
        return Boolean.TRUE.equals(allowSms);
    }
}
