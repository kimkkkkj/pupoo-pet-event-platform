// file: src/main/java/com/popups/pupoo/event/domain/model/EventInterestMap.java
package com.popups.pupoo.event.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import static lombok.AccessLevel.PROTECTED;

/**
 * EventInterestMap
 *
 * [DB: event_interest_map] (추가 테이블)
 * - event_interest_map_id BIGINT PK
 * - event_id BIGINT (FK: event.event_id)
 * - interest_id BIGINT (FK: interests.interest_id)
 * - created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(
        name = "event_interest_map",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_event_interest", columnNames = {"event_id", "interest_id"})
        },
        indexes = {
                @Index(name = "idx_interest_event", columnList = "interest_id,event_id")
        }
)
public class EventInterestMap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_interest_map_id", nullable = false)
    private Long eventInterestMapId;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "interest_id", nullable = false)
    private Long interestId;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public static EventInterestMap create(Long eventId, Long interestId) {
        EventInterestMap m = new EventInterestMap();
        m.eventId = eventId;
        m.interestId = interestId;
        return m;
    }
}
