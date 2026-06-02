// file: src/main/java/com/popups/pupoo/interest/dto/InterestUnsubscribeRequest.java
package com.popups.pupoo.interest.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class InterestUnsubscribeRequest {

    @NotNull
    private Long interestId;
}
