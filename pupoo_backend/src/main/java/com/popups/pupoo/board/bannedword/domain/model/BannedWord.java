// file: src/main/java/com/popups/pupoo/board/bannedword/domain/model/BannedWord.java
package com.popups.pupoo.board.bannedword.domain.model;

import com.popups.pupoo.board.bannedword.domain.enums.BannedWordCategory;
import com.popups.pupoo.board.boardinfo.domain.model.Board;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 금칙어 엔티티
 *
 * - DB: board_banned_words (v6.6: category, replacement, board_id NULL 허용)
 * - board_id NULL: 전역 공통 금지어. 특정 ID: 해당 게시판 전용.
 * - category: 금지 표현 카테고리 (모더레이션·RAG와 동일 코드 사용)
 */
@Entity
@Table(name = "board_banned_words")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class BannedWord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "banned_word_id", nullable = false)
    private Long bannedWordId;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "board_id", nullable = true)
    private Board board;

    @Column(name = "banned_word", nullable = false, length = 100)
    private String bannedWord;

    @Column(name = "replacement", length = 100)
    private String replacement;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private BannedWordCategory category;

    // banned_word_norm은 GENERATED 컬럼이므로 매핑하지 않는다.

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (this.category == null) {
            this.category = BannedWordCategory.OTHER;
        }
    }

    /**
     * 관리자 수정 시 필드 갱신 (null이 아닌 값만 반영, replacement는 null이면 미변경)
     */
    public void update(String bannedWord, BannedWordCategory category, String replacement) {
        if (bannedWord != null && !bannedWord.isBlank()) {
            this.bannedWord = bannedWord;
        }
        if (category != null) {
            this.category = category;
        }
        if (replacement != null) {
            this.replacement = replacement;
        }
    }
}
