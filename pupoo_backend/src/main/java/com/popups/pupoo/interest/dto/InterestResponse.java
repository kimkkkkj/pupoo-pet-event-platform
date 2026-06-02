// file: src/main/java/com/popups/pupoo/interest/dto/InterestResponse.java
package com.popups.pupoo.interest.dto;

import com.popups.pupoo.interest.domain.enums.InterestName;
import com.popups.pupoo.interest.domain.enums.InterestType;
import com.popups.pupoo.interest.domain.model.Interest;
import lombok.Getter;

@Getter
public class InterestResponse {

    private final Long interestId;
    private final InterestName interestName;
    private final InterestType type;
    private final Boolean isActive;

    public InterestResponse(Long interestId,
                            InterestName interestName,
                            InterestType type,
                            Boolean isActive) {
        this.interestId = interestId;
        this.interestName = interestName;
        this.type = type;
        this.isActive = isActive;
    }

    public static InterestResponse from(Interest interest) {
        return new InterestResponse(
                interest.getInterestId(),
                interest.getInterestName(),
                interest.getType(),
                interest.isActive()   
        );
    }
}
