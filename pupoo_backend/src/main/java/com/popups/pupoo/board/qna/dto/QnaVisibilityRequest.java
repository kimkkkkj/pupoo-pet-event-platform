package com.popups.pupoo.board.qna.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * 관리자 QnA 노출 상태 변경 — posts.status: PUBLISHED | HIDDEN
 */
@Getter
@Setter
public class QnaVisibilityRequest {

    @NotBlank
    private String publicationStatus;
}
