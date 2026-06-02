// file: src/main/java/com/popups/pupoo/event/dto/AdminEventCreateRequest.java
package com.popups.pupoo.event.dto;

import com.popups.pupoo.event.domain.enums.EventStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 관리자용 행사 등록 요청 DTO
 * - interestIds: event_interest_map 저장용
 */
public class AdminEventCreateRequest {

    private String eventName;
    private String description;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private String location;
    private String imageUrl;
    private String organizer;
    private EventStatus status;
    private Integer roundNo;
    private BigDecimal baseFee;

    private List<Long> interestIds;

    public String getEventName() { return eventName; }
    public String getDescription() { return description; }
    public LocalDateTime getStartAt() { return startAt; }
    public LocalDateTime getEndAt() { return endAt; }
    public String getLocation() { return location; }
    public String getImageUrl() { return imageUrl; }
    public String getOrganizer() { return organizer; }
    public EventStatus getStatus() { return status; }
    public Integer getRoundNo() { return roundNo; }
    public BigDecimal getBaseFee() { return baseFee; }
    public List<Long> getInterestIds() { return interestIds; }
}
