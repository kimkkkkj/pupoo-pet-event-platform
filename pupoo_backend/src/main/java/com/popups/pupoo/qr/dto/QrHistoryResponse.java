// file: src/main/java/com/popups/pupoo/qr/dto/QrHistoryResponse.java
package com.popups.pupoo.qr.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

public class QrHistoryResponse {

    @Getter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class BoothVisitSummary {
        private Long boothId;
        private String placeName;
        private String zone;
        private String type;
        private String status;

        //  추가
        private String company;
        private String description;

        private int visitCount;
        private LocalDateTime lastVisitedAt;
        private String lastCheckType;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class EventBoothVisits {
        private Long eventId;
        private String eventName;
        private List<BoothVisitSummary> booths;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class VisitLog {
        private Long logId;
        private String checkType;
        private LocalDateTime checkedAt;
    }
}
