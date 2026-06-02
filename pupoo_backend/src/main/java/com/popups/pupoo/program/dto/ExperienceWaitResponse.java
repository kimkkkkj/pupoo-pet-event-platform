// file: src/main/java/com/popups/pupoo/program/dto/ExperienceWaitResponse.java
package com.popups.pupoo.program.dto;

import com.popups.pupoo.program.domain.model.ExperienceWait;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ExperienceWaitResponse {

    private Integer waitCount;
    private Integer waitMin;
    private LocalDateTime updatedAt;

    public static ExperienceWaitResponse from(ExperienceWait w) {
        if (w == null) return null;
        return ExperienceWaitResponse.builder()
                .waitCount(w.getWaitCount())
                .waitMin(w.getWaitMin())
                .updatedAt(w.getUpdatedAt())
                .build();
    }
}
