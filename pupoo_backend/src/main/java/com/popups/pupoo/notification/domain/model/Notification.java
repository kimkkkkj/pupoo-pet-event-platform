// file: src/main/java/com/popups/pupoo/notification/domain/model/Notification.java
package com.popups.pupoo.notification.domain.model;

import com.popups.pupoo.notification.domain.enums.NotificationType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import static lombok.AccessLevel.PROTECTED;

/**
 * Notification
 *
 * [DB: notification]
 * - notification_id BIGINT PK
 * - type ENUM('EVENT','NOTICE','PAYMENT','APPLY','SYSTEM')
 * - notification_title VARCHAR(255)
 * - content VARCHAR(255)
 * - created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "notification")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id", nullable = false)
    private Long notificationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20, columnDefinition = "ENUM('EVENT','NOTICE','PAYMENT','APPLY','SYSTEM')")
    private NotificationType type;

    @Column(name = "notification_title", nullable = false, length = 255)
    private String notificationTitle;

    @Column(name = "content", nullable = false, length = 255)
    private String content;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public static Notification create(NotificationType type, String title, String content) {
        Notification n = new Notification();
        n.type = type;
        n.notificationTitle = title;
        n.content = content;
        return n;
    }
}
