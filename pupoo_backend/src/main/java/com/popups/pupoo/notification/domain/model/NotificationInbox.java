// file: src/main/java/com/popups/pupoo/notification/domain/model/NotificationInbox.java
package com.popups.pupoo.notification.domain.model;

import com.popups.pupoo.notification.domain.enums.InboxTargetType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import static lombok.AccessLevel.PROTECTED;

/**
 * NotificationInbox
 *
 * [DB: notification_inbox]
 * - inbox_id BIGINT PK
 * - user_id BIGINT
 * - notification_id BIGINT (FK)
 * - created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 * - target_type ENUM('EVENT','NOTICE') NULL
 * - target_id BIGINT NULL
 *
 * 정책: "읽는 순간(클릭) 인박스에서 삭제" -> read flag 컬럼 불필요.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "notification_inbox")
public class NotificationInbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "inbox_id", nullable = false)
    private Long inboxId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "notification_id", nullable = false)
    private Notification notification;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", length = 20, columnDefinition = "ENUM('EVENT','NOTICE')")
    private InboxTargetType targetType;

    @Column(name = "target_id")
    private Long targetId;

    public static NotificationInbox create(Long userId,
                                           Notification notification,
                                           InboxTargetType targetType,
                                           Long targetId) {
        NotificationInbox i = new NotificationInbox();
        i.userId = userId;
        i.notification = notification;
        i.targetType = targetType;
        i.targetId = targetId;
        return i;
    }
}
