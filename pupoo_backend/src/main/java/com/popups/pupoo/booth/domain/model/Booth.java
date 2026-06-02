package com.popups.pupoo.booth.domain.model;

import com.popups.pupoo.booth.domain.enums.BoothStatus;
import com.popups.pupoo.booth.domain.enums.BoothZone;
import com.popups.pupoo.booth.domain.enums.BoothType;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "booths")
public class Booth {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "booth_id")
    private Long boothId;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "place_name", nullable = false, length = 100)
    private String placeName;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30, columnDefinition = "ENUM('BOOTH_COMPANY','BOOTH_EXPERIENCE','BOOTH_SALE','BOOTH_FOOD','BOOTH_INFO','BOOTH_SPONSOR','SESSION_ROOM','CONTEST_ZONE','STAGE','ETC')")
    private BoothType type;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "company", length = 100)
    private String company;

    @Enumerated(EnumType.STRING)
    @Column(name = "zone", nullable = false, length = 20, columnDefinition = "ENUM('ZONE_A','ZONE_B','ZONE_C','OTHER')")
    private BoothZone zone;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20, columnDefinition = "ENUM('OPEN','CLOSED','PAUSED')")
    private BoothStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected Booth() {}

    // ★ 추가: 관리자 생성용 팩토리 메서드
    public static Booth create(Long eventId, String placeName, BoothType type,
                                String description, String company,
                                BoothZone zone, BoothStatus status) {
        Booth b = new Booth();
        b.eventId = eventId;
        b.placeName = placeName;
        b.type = type;
        b.description = description;
        b.company = company;
        b.zone = zone;
        b.status = (status != null) ? status : BoothStatus.OPEN;
        b.createdAt = LocalDateTime.now();
        return b;
    }

    // ★ 추가: 관리자 수정 메서드
    public void update(String placeName, BoothType type, String description,
                       String company, BoothZone zone, BoothStatus status) {
        if (placeName != null) this.placeName = placeName;
        if (type != null)      this.type = type;
        if (description != null) this.description = description;
        if (company != null)   this.company = company;
        if (zone != null)      this.zone = zone;
        if (status != null)    this.status = status;
    }

    public Long getBoothId() { return boothId; }
    public Long getEventId() { return eventId; }
    public String getPlaceName() { return placeName; }
    public BoothType getType() { return type; }
    public String getDescription() { return description; }
    public String getCompany() { return company; }
    public BoothZone getZone() { return zone; }
    public BoothStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
