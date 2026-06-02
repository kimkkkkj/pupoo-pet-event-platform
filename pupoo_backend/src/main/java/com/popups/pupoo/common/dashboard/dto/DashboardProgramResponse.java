package com.popups.pupoo.common.dashboard.dto;

import com.popups.pupoo.program.domain.enums.ProgramCategory;
import com.popups.pupoo.program.domain.model.Program;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DashboardProgramResponse {

    private Long programId;
    private Long eventId;
    private String id;
    private String name;
    private String category;
    private int sessions;
    private String status;
    private long enrolled;
    private String description;
    private String imageUrl;

    public static DashboardProgramResponse from(Program program, long enrolledCount, String imageUrl) {
        return DashboardProgramResponse.builder()
                .programId(program.getProgramId())
                .eventId(program.getEventId())
                .id("PG-" + String.format("%03d", program.getProgramId()))
                .name(program.getProgramTitle())
                .category(mapCategory(program.getCategory()))
                .sessions(1)
                .status(mapStatus(program))
                .enrolled(enrolledCount)
                .description(program.getDescription() != null ? program.getDescription() : "")
                .imageUrl(imageUrl)
                .build();
    }

    private static String mapCategory(ProgramCategory category) {
        if (category == null) {
            return "교육";
        }
        return switch (category) {
            case CONTEST -> "대회";
            case SESSION -> "교육";
            case EXPERIENCE -> "체험";
        };
    }

    private static String mapStatus(Program program) {
        if (program.isOngoing()) {
            return "active";
        }
        if (program.isEnded()) {
            return "ended";
        }
        return "pending";
    }
}
