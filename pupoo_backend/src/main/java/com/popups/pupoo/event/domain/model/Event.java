// file: src/main/java/com/popups/pupoo/event/domain/model/Event.java
package com.popups.pupoo.event.domain.model;

import com.popups.pupoo.event.domain.enums.EventStatus;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Event 엔티티 (pupoo_v2.5 기준)
 *
 * 테이블: event
 * 컬럼:
 * - event_id (PK)
 * - event_name
 * - description
 * - start_at
 * - end_at
 * - location
 * - status (PLANNED/ONGOING/ENDED/CANCELLED)
 * - round_no
 *
 *  created_at/updated_at 없음 (사용자 확인 반영)
 */
@Entity
@Table(name = "event")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id")
    private Long eventId;

    @Column(name = "event_name", nullable = false, length = 255)
    private String eventName;

    @Column(name = "description", nullable = false, length = 1000)
    private String description;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private LocalDateTime endAt;

    @Column(name = "location", length = 255)
    private String location;

    // TODO(step-01-storage-policy): keep the legacy column name for now, but store a storage key instead of a full URL.
    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "organizer", length = 255)
    private String organizer;

    @Column(name = "organizer_phone", length = 30)
    private String organizerPhone;

    @Column(name = "organizer_email", length = 255)
    private String organizerEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20, columnDefinition = "ENUM('PLANNED','ONGOING','ENDED','CANCELLED')")
    private EventStatus status;

    @Column(name = "round_no")
    private Integer roundNo;

    @Column(name = "base_fee", precision = 10, scale = 2, nullable = false)
    private BigDecimal baseFee = BigDecimal.ZERO;

    protected Event() {
        // JPA 기본 생성자
    }

    public static Event create(
            String eventName,
            String description,
            LocalDateTime startAt,
            LocalDateTime endAt,
            String location,
            String imageUrl,
            String organizer,
            EventStatus status,
            Integer roundNo,
            BigDecimal baseFee
    ) {
        Event e = new Event();
        e.eventName = eventName;
        e.description = description;
        e.startAt = startAt;
        e.endAt = endAt;
        e.location = location;
        e.imageUrl = imageUrl;
        e.organizer = organizer;
        e.status = status;
        e.roundNo = roundNo;
        e.baseFee = baseFee != null ? baseFee : BigDecimal.ZERO;
        return e;
    }

    public void update(
            String eventName,
            String description,
            LocalDateTime startAt,
            LocalDateTime endAt,
            String location,
            String imageUrl,
            String organizer,
            EventStatus status,
            Integer roundNo,
            BigDecimal baseFee
    ) {
        this.eventName = eventName;
        this.description = description;
        this.startAt = startAt;
        this.endAt = endAt;
        this.location = location;
        this.imageUrl = imageUrl;
        this.organizer = organizer;
        this.status = status;
        this.roundNo = roundNo;
        if (baseFee != null) {
            this.baseFee = baseFee;
        }
    }

    /**
     * 관리자 운영용 상태 전환
     */
    public void changeStatus(EventStatus status) {
        this.status = status;
    }

    // ===== Getter =====
    public Long getEventId() { return eventId; }
    public String getEventName() { return eventName; }
    public String getDescription() { return description; }
    public LocalDateTime getStartAt() { return startAt; }
    public LocalDateTime getEndAt() { return endAt; }
    public String getLocation() { return location; }
    public String getImageUrl() { return imageUrl; }
    public String getOrganizer() { return organizer; }
    public String getOrganizerPhone() { return organizerPhone; }
    public String getOrganizerEmail() { return organizerEmail; }
    public EventStatus getStatus() { return status; }
    public Integer getRoundNo() { return roundNo; }
    public BigDecimal getBaseFee() { return baseFee; }

    	
    public boolean isClosed() {
        return this.status == EventStatus.ENDED
            || this.status == EventStatus.CANCELLED;
    }

}
