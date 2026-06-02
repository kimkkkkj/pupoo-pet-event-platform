package com.popups.pupoo.board.bannedword.domain.model;

import com.popups.pupoo.board.bannedword.domain.enums.BannedWordCategory;
import com.popups.pupoo.board.bannedword.domain.enums.FilterAction;
import com.popups.pupoo.board.bannedword.domain.enums.FilterTiming;
import com.popups.pupoo.board.boardinfo.domain.model.Board;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 게시판별 필터링 정책 (board_filter_policy)
 * (board_id, category) 단위로 BLOCK/MASK/PASS 및 적용 시점 설정.
 */
@Entity
@Table(name = "board_filter_policy", uniqueConstraints = {
    @UniqueConstraint(name = "uk_board_category_policy", columnNames = {"board_id", "category"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class BoardFilterPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "policy_id", nullable = false)
    private Long policyId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private BannedWordCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "filter_action", nullable = false, length = 10)
    private FilterAction filterAction;

    @Enumerated(EnumType.STRING)
    @Column(name = "filter_timing", nullable = false, length = 10)
    private FilterTiming filterTiming;

    @Column(name = "use_ai_check", nullable = true)
    private Boolean useAiCheck;

    @Column(name = "ai_threshold", nullable = true)
    private Float aiThreshold;

    @Column(name = "updated_at", nullable = true, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
