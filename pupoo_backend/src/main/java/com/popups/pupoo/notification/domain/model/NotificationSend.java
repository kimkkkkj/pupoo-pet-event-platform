// file: src/main/java/com/popups/pupoo/notification/domain/model/NotificationSend.java
package com.popups.pupoo.notification.domain.model;

import com.popups.pupoo.notification.domain.enums.NotificationChannel;
import com.popups.pupoo.notification.domain.enums.SenderType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import static lombok.AccessLevel.PROTECTED;

/**
 * NotificationSend
 *
 * [DB: notification_send]
 * - send_id BIGINT PK
 * - notification_id BIGINT FK
 * - sender_id BIGINT FK(users)
 * - sender_type ENUM('USER','ADMIN','SYSTEM')
 * - channel ENUM('APP','EMAIL','SMS','PUSH')
 * - sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "notification_send")
public class NotificationSend {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "send_id", nullable = false)
    private Long sendId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "notification_id", nullable = false)
    private Notification notification;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false, length = 20, columnDefinition = "ENUM('USER','ADMIN','SYSTEM')")
    private SenderType senderType;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 20, columnDefinition = "ENUM('APP','EMAIL','SMS','PUSH')")
    private NotificationChannel channel;

    @Column(name = "sent_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime sentAt;

    public static NotificationSend create(Notification notification,
                                          Long senderId,
                                          SenderType senderType,
                                          NotificationChannel channel) {
        NotificationSend s = new NotificationSend();
        s.notification = notification;
        s.senderId = senderId;
        s.senderType = senderType;
        s.channel = channel;
        return s;
    }
}
