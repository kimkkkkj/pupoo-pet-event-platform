// file: src/main/java/com/popups/pupoo/board/boardinfo/domain/model/Board.java
package com.popups.pupoo.board.boardinfo.domain.model;

import com.popups.pupoo.board.boardinfo.domain.enums.BoardType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "boards")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Board {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "board_id", nullable = false)
    private Long boardId;

    @Column(name = "board_name", nullable = false, length = 50)
    private String boardName;

    @Enumerated(EnumType.STRING)
    @Column(name = "board_type", nullable = false, columnDefinition = "ENUM('FREE','INFO','REVIEW','QNA','FAQ')")
    private BoardType boardType;

    @Column(name = "is_active", nullable = false, columnDefinition = "TINYINT(1)")
    private boolean active;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    public void updateBoardName(String boardName) {
        this.boardName = boardName;
    }

    public void changeActive(boolean active) {
        this.active = active;
    }
}
