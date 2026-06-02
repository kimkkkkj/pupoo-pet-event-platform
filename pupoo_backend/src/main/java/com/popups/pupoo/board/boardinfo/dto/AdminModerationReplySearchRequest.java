// file: src/main/java/com/popups/pupoo/board/boardinfo/dto/AdminModerationReplySearchRequest.java
package com.popups.pupoo.board.boardinfo.dto;

import com.popups.pupoo.reply.domain.enums.ReplyTargetType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 관리자 모더레이션 큐(댓글) 조회 조건.
 */
@Getter
@Setter
@NoArgsConstructor
public class AdminModerationReplySearchRequest {

    /**
     * POST 또는 REVIEW. 미지정 시 POST로 간주한다.
     */
    private ReplyTargetType targetType;

    /**
     * 부모 ID (POST면 postId, REVIEW면 reviewId). 미지정 시 전체.
     */
    private Long parentId;

    private Long userId;
    private String keyword;
    private Boolean deleted;
    private LocalDateTime from;
    private LocalDateTime to;

    /**
     * true면 신고(PENDING)된 대상만 조회한다.
     */
    private Boolean reportedOnly;
}
