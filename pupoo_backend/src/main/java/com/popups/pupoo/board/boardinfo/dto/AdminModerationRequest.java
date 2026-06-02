// file: src/main/java/com/popups/pupoo/board/boardinfo/dto/AdminModerationRequest.java
package com.popups.pupoo.board.boardinfo.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 관리자 모더레이션 요청 DTO.
 * - reason: 블라인드/삭제 등 사유(선택)
 * - hardDelete: true면 영구삭제(하드 삭제) 수행
 */
@Getter
@NoArgsConstructor
public class AdminModerationRequest {

    private String reason;
    private Boolean hardDelete;
}
