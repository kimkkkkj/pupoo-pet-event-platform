package com.popups.pupoo.ai.dto;

import com.popups.pupoo.notice.dto.NoticeResponse;
import com.popups.pupoo.notification.dto.AdminNotificationItemResponse;

import java.util.List;

public record AdminOrchestrationSummaryResponse(
        CongestionSummary congestion,
        ApplicantSummary applicants,
        NoticeSummary notices,
        NotificationSummary notifications,
        RefundSummary refunds
) {
    public AdminOrchestrationSummaryResponse {
        if (applicants == null) {
            applicants = new ApplicantSummary(
                    new EventRegistrationSummary(0, 0, 0, 0, 0),
                    new ProgramApplySummary(0, 0, 0, 0, 0, 0, 0),
                    new ApplicantInterpretation(List.of(), List.of(), "", "", "")
            );
        }
        if (notices == null) {
            notices = new NoticeSummary(0, 0, 0, List.of());
        }
        if (notifications == null) {
            notifications = new NotificationSummary(0, 0, List.of());
        }
    }

    public record CongestionSummary(
            long plannedEventCount,
            long ongoingEventCount,
            long endedEventCount,
            long cancelledEventCount,
            long todayCheckinCount
    ) {
    }

    public record ApplicantSummary(
            EventRegistrationSummary eventRegistrations,
            ProgramApplySummary programApplies,
            ApplicantInterpretation interpretation
    ) {
        public ApplicantSummary {
            if (eventRegistrations == null) {
                eventRegistrations = new EventRegistrationSummary(0, 0, 0, 0, 0);
            }
            if (programApplies == null) {
                programApplies = new ProgramApplySummary(0, 0, 0, 0, 0, 0, 0);
            }
            if (interpretation == null) {
                interpretation = new ApplicantInterpretation(List.of(), List.of(), "", "", "");
            }
        }
    }

    public record ApplicantInterpretation(
            List<String> eventRegistrationActiveStatuses,
            List<String> programApplyActiveStatuses,
            String eventRegistrationActiveCountRule,
            String programApplyActiveCountRule,
            String checkedInCountMeaning
    ) {
        public ApplicantInterpretation {
            eventRegistrationActiveStatuses = eventRegistrationActiveStatuses == null ? List.of() : List.copyOf(eventRegistrationActiveStatuses);
            programApplyActiveStatuses = programApplyActiveStatuses == null ? List.of() : List.copyOf(programApplyActiveStatuses);
            eventRegistrationActiveCountRule = eventRegistrationActiveCountRule == null ? "" : eventRegistrationActiveCountRule;
            programApplyActiveCountRule = programApplyActiveCountRule == null ? "" : programApplyActiveCountRule;
            checkedInCountMeaning = checkedInCountMeaning == null ? "" : checkedInCountMeaning;
        }
    }

    public record EventRegistrationSummary(
            long appliedCount,
            long approvedCount,
            long rejectedCount,
            long cancelledCount,
            long activeCount
    ) {
    }

    public record ProgramApplySummary(
            long appliedCount,
            long waitingCount,
            long approvedCount,
            long rejectedCount,
            long cancelledCount,
            long checkedInCount,
            long activeCount
    ) {
    }

    public record NoticeSummary(
            long publishedCount,
            long draftCount,
            long hiddenCount,
            List<NoticeResponse> recent
    ) {
        public NoticeSummary {
            recent = recent == null ? List.of() : List.copyOf(recent);
        }
    }

    public record NotificationSummary(
            long draftCount,
            long sentCount,
            List<AdminNotificationItemResponse> recent
    ) {
        public NotificationSummary {
            recent = recent == null ? List.of() : List.copyOf(recent);
        }
    }

    public record RefundSummary(
            long requestedCount,
            long approvedCount,
            long rejectedCount,
            long completedCount,
            long totalCount
    ) {
    }
}
