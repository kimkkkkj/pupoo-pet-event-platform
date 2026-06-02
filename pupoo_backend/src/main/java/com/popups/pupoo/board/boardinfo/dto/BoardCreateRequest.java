// file: src/main/java/com/popups/pupoo/board/boardinfo/dto/BoardCreateRequest.java
package com.popups.pupoo.board.boardinfo.dto;

import com.popups.pupoo.board.boardinfo.domain.enums.BoardType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class BoardCreateRequest {
    private String boardName;
    private BoardType boardType;
    private Boolean active;
}
