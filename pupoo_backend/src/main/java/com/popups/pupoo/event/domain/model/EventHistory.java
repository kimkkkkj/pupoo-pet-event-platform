// file: src/main/java/com/popups/pupoo/event/domain/model/EventHistory.java
package com.popups.pupoo.event.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 참여 이력
 *
 * - 사용자가 "어떤 행사"의 "어떤 프로그램"에 실제 참여했는지 기록한다.
 * - 다회 참여를 허용하므로 UNIQUE 제약은 두지 않는다.
 */
@Entity
@Table(name = "event_history")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class EventHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_id")
    private Long historyId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "program_id", nullable = false)
    private Long programId;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;
}
