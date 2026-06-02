// file: src/main/java/com/popups/pupoo/booth/domain/model/BoothWait.java
package com.popups.pupoo.booth.domain.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "booth_waits")
public class BoothWait {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wait_id")
    private Long waitId;

    @Column(name = "booth_id", nullable = false, unique = true)
    private Long boothId;

    @Column(name = "wait_count")
    private Integer waitCount;

    @Column(name = "wait_min")
    private Integer waitMin;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected BoothWait() {}

    public static BoothWait create(Long boothId, int waitCount, int waitMin, LocalDateTime updatedAt) {
        BoothWait boothWait = new BoothWait();
        boothWait.boothId = boothId;
        boothWait.waitCount = Math.max(waitCount, 0);
        boothWait.waitMin = Math.max(waitMin, 0);
        boothWait.updatedAt = (updatedAt == null) ? LocalDateTime.now() : updatedAt;
        return boothWait;
    }

    public void applySnapshot(int waitCount, int waitMin, LocalDateTime updatedAt) {
        this.waitCount = Math.max(waitCount, 0);
        this.waitMin = Math.max(waitMin, 0);
        this.updatedAt = (updatedAt == null) ? LocalDateTime.now() : updatedAt;
    }

    public Long getWaitId() { return waitId; }
    public Long getBoothId() { return boothId; }
    public Integer getWaitCount() { return waitCount; }
    public Integer getWaitMin() { return waitMin; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
