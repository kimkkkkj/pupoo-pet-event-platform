// file: src/main/java/com/popups/pupoo/notice/domain/model/Notice.java
package com.popups.pupoo.notice.domain.model;

import com.popups.pupoo.notice.domain.enums.NoticeStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notices")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder(toBuilder = true)
public class Notice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notice_id", nullable = false)
    private Long noticeId;

    @Column(name = "scope", nullable = false, length = 20)
    private String scope;

    @Column(name = "event_id")
    private Long eventId;

    @Column(name = "notice_title", nullable = false, length = 255)
    private String noticeTitle;

    @Column(name = "content", nullable = false, length = 1000)
    private String content;

    @Column(name = "file_attached", nullable = false, columnDefinition = "ENUM('Y','N')")
    private String fileAttached; // 'Y' 또는 'N'

    @Column(name = "is_pinned", nullable = false, columnDefinition = "TINYINT(1)")
    private boolean pinned;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "ENUM('PUBLISHED','DRAFT','HIDDEN')")
    private NoticeStatus status;

    @Column(name = "created_by_admin_id", nullable = false)
    private Long createdByAdminId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "view_count", nullable = false)
    private int viewCount;
}
