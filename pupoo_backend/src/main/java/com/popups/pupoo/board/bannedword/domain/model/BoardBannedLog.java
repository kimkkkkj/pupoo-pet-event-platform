package com.popups.pupoo.board.bannedword.domain.model;

import com.popups.pupoo.board.bannedword.domain.enums.BannedLogContentType;
import com.popups.pupoo.board.bannedword.domain.enums.FilterAction;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 금칙어 적발·검토 로그 (board_banned_logs)
 */
@Entity
@Table(name = "board_banned_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class BoardBannedLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id", nullable = false)
    private Long logId;

    @Column(name = "board_id", nullable = false)
    private Long boardId;

    @Column(name = "content_id", nullable = true)
    private Long contentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_type", nullable = false, length = 20)
    private BannedLogContentType contentType;

    @Column(name = "user_id", nullable = true)
    private Long userId;

    @Column(name = "detected_word", length = 100)
    private String detectedWord;

    @Enumerated(EnumType.STRING)
    @Column(name = "filter_action_taken", length = 10)
    private FilterAction filterActionTaken;

    @Column(name = "ai_score", nullable = true)
    private Float aiScore;

    @Column(name = "rag_reason", columnDefinition = "TEXT", nullable = true)
    private String ragReason;

    @Column(name = "created_at", nullable = true, insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
