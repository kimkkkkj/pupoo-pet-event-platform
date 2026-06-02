// file: src/main/java/com/popups/pupoo/board/boardinfo/dto/BoardResponse.java
package com.popups.pupoo.board.boardinfo.dto;

import com.popups.pupoo.board.boardinfo.domain.enums.BoardType;
import com.popups.pupoo.board.boardinfo.domain.model.Board;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class BoardResponse {

    private Long boardId;
    private String boardName;
    private BoardType boardType;
    private boolean active;
    private LocalDateTime createdAt;

    public static BoardResponse from(Board board) {
        BoardResponse r = new BoardResponse();
        r.boardId = board.getBoardId();
        r.boardName = board.getBoardName();
        r.boardType = board.getBoardType();
        r.active = board.isActive();
        r.createdAt = board.getCreatedAt();
        return r;
    }
}
