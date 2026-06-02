package com.popups.pupoo.ai.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "event_congestion_policy")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EventCongestionPolicy {

    @Id
    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "capacity_baseline", nullable = false)
    private Integer capacityBaseline;

    @Column(name = "wait_baseline", nullable = false)
    private Integer waitBaseline;

    @Column(name = "target_wait_min", nullable = false)
    private Integer targetWaitMin;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
