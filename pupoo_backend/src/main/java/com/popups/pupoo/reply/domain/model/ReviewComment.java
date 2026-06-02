// file: src/main/java/com/popups/pupoo/reply/domain/model/ReviewComment.java
package com.popups.pupoo.reply.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "review_comments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder(toBuilder = true)
public class ReviewComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "comment_id", nullable = false)
    private Long commentId;

    @Column(name = "review_id", nullable = false)
    private Long reviewId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "content", nullable = false, length = 1000)
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "is_deleted", nullable = false, columnDefinition = "TINYINT")
    private boolean deleted;

    public ReviewComment updateContent(String content, LocalDateTime now) {
        return this.toBuilder()
                .content(content)
                .updatedAt(now)
                .build();
    }

    public ReviewComment markDeleted(LocalDateTime now) {
        return this.toBuilder()
                .deleted(true)
                .updatedAt(now)
                .build();
    }

    /**
     * 관리자 모더레이션: 복구(soft delete 해제)
     */
    public ReviewComment restore(LocalDateTime now) {
        return this.toBuilder()
                .deleted(false)
                .updatedAt(now)
                .build();
    }
}
