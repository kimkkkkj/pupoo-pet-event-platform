// file: src/main/java/com/popups/pupoo/notification/domain/model/NotificationSettings.java
package com.popups.pupoo.notification.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import static lombok.AccessLevel.PROTECTED;

/**
 * NotificationSettings
 *
 * [DB: notification_settings]
 * - user_id PK
 * - allow_marketing TINYINT
 * - updated_at DATETIME (ON UPDATE CURRENT_TIMESTAMP)
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "notification_settings")
public class NotificationSettings {

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "allow_marketing", nullable = false, columnDefinition = "TINYINT(1)")
    private boolean allowMarketing;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public static NotificationSettings createDefault(Long userId) {
        NotificationSettings s = new NotificationSettings();
        s.userId = userId;
        s.allowMarketing = false;
        return s;
    }

    public void updateAllowMarketing(boolean allowMarketing) {
        this.allowMarketing = allowMarketing;
    }
}
