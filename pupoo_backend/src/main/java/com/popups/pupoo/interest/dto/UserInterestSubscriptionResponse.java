// file: src/main/java/com/popups/pupoo/interest/dto/UserInterestSubscriptionResponse.java
package com.popups.pupoo.interest.dto;

import com.popups.pupoo.interest.domain.enums.InterestName;
import com.popups.pupoo.interest.domain.enums.InterestType;
import com.popups.pupoo.interest.domain.enums.SubscriptionStatus;
import com.popups.pupoo.interest.domain.model.UserInterestSubscription;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class UserInterestSubscriptionResponse {

    private final Long subscriptionId;

    private final Long interestId;
    private final InterestType type;
    private final InterestName interestName;

    private final boolean allowInapp;
    private final boolean allowEmail;
    private final boolean allowSms;

    private final SubscriptionStatus status;
    private final LocalDateTime createdAt;

    public UserInterestSubscriptionResponse(Long subscriptionId,
                                           Long interestId,
                                           InterestType type,
                                           InterestName interestName,
                                           boolean allowInapp,
                                           boolean allowEmail,
                                           boolean allowSms,
                                           SubscriptionStatus status,
                                           LocalDateTime createdAt) {
        this.subscriptionId = subscriptionId;
        this.interestId = interestId;
        this.type = type;
        this.interestName = interestName;
        this.allowInapp = allowInapp;
        this.allowEmail = allowEmail;
        this.allowSms = allowSms;
        this.status = status;
        this.createdAt = createdAt;
    }

    public static UserInterestSubscriptionResponse from(UserInterestSubscription s) {
        return new UserInterestSubscriptionResponse(
                s.getSubscriptionId(),
                s.getInterest().getInterestId(),
                s.getInterest().getType(),
                s.getInterest().getInterestName(),
                s.isAllowInapp(),
                s.isAllowEmail(),
                s.isAllowSms(),
                s.getStatus(),
                s.getCreatedAt()
        );
    }
}
