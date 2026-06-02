// file: src/main/java/com/popups/pupoo/board/boardinfo/dto/BoardUpdateRequest.java
package com.popups.pupoo.board.boardinfo.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class BoardUpdateRequest {
    private String boardName;
    private Boolean active;
}
