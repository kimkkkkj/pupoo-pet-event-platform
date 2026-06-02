// file: src/main/java/com/popups/pupoo/program/dto/ProgramResponse.java
package com.popups.pupoo.program.dto;

import com.popups.pupoo.program.domain.enums.ProgramCategory;
import com.popups.pupoo.program.domain.model.Program;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ProgramResponse {

    private Long programId;
    private Long eventId;
    private ProgramCategory category;
    private String programTitle;
    private String description;
    private String imageUrl;
    private Long boothId;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private boolean ongoing;
    private boolean upcoming;
    private boolean ended;
    private long participantCount;
    private ExperienceWaitResponse experienceWait;

    public static ProgramResponse from(Program program, String imageUrl, long participantCount) {
        if (program == null) {
            throw new IllegalArgumentException("Program is null");
        }

        return ProgramResponse.builder()
                .programId(program.getProgramId())
                .eventId(program.getEventId())
                .category(program.getCategory())
                .programTitle(program.getProgramTitle())
                .description(program.getDescription())
                .imageUrl(imageUrl)
                .boothId(program.getBoothId())
                .startAt(program.getStartAt())
                .endAt(program.getEndAt())
                .ongoing(program.isOngoing())
                .upcoming(program.isUpcoming())
                .ended(program.isEnded())
                .participantCount(Math.max(0, participantCount))
                .experienceWait(null)
                .build();
    }
}
