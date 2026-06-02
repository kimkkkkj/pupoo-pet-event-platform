// file: src/main/java/com/popups/pupoo/board/post/domain/model/Post.java
package com.popups.pupoo.board.post.domain.model;

import com.popups.pupoo.board.boardinfo.domain.model.Board;
import com.popups.pupoo.board.post.domain.enums.PostStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "posts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "post_id", nullable = false)
    private Long postId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "post_title", nullable = false, length = 255)
    private String postTitle;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "answer_content", columnDefinition = "TEXT")
    private String answerContent;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;

    @Column(name = "file_attached", nullable = false, columnDefinition = "ENUM('Y','N')")
    private String fileAttached; // 'Y' 또는 'N'

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "ENUM('DRAFT','PUBLISHED','HIDDEN')")
    private PostStatus status;

    @Column(name = "view_count", nullable = false)
    private int viewCount;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "is_deleted", nullable = false, columnDefinition = "TINYINT(1)")
    private boolean deleted;

    @Column(name = "is_comment_enabled", nullable = false, columnDefinition = "TINYINT(1)")
    private boolean commentEnabled;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) this.createdAt = now;
        if (this.updatedAt == null) this.updatedAt = now;
        if (this.fileAttached == null) this.fileAttached = "N";
        if (this.status == null) this.status = PostStatus.PUBLISHED;
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void updateTitleAndContent(String title, String content) {
        this.postTitle = title;
        this.content = content;
    }

    public void markDeleted() {
        this.deleted = true;
    }

    /**
     * 관리자 모더레이션용: soft delete.
     */
    public void softDelete() {
        this.deleted = true;
    }

    /**
     * 관리자 모더레이션용: 게시글 블라인드.
     */
    public void hide() {
        this.status = PostStatus.HIDDEN;
    }

    /**
     * 관리자 모더레이션용: 게시글 복구.
     */
    public void restore() {
        this.deleted = false;
        this.status = PostStatus.PUBLISHED;
    }

    public void close() {
        this.status = PostStatus.HIDDEN;
    }

        public void writeAnswer(String answerContent) {
        this.answerContent = answerContent;
        this.answeredAt = LocalDateTime.now();
    }

    public void clearAnswer() {
        this.answerContent = null;
        this.answeredAt = null;
    }

    public void setFileAttached(boolean attached) {
        this.fileAttached = attached ? "Y" : "N";
    }
}
