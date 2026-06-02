// file: src/main/java/com/popups/pupoo/board/boardinfo/dto/AdminModerationPostSearchRequest.java
package com.popups.pupoo.board.boardinfo.dto;

import com.popups.pupoo.board.post.domain.enums.PostStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 관리자 모더레이션 큐(게시글) 조회 조건.
 */
@Getter
@Setter
@NoArgsConstructor
public class AdminModerationPostSearchRequest {

    private Long boardId;
    private Long userId;
    private String keyword;
    private PostStatus status;
    private Boolean deleted;
    private LocalDateTime from;
    private LocalDateTime to;

    /**
     * true면 신고(PENDING)된 대상만 조회한다.
     */
    private Boolean reportedOnly;
}
