// file: src/main/java/com/popups/pupoo/board/qna/domain/model/Qna.java
package com.popups.pupoo.board.qna.domain.model;

import com.popups.pupoo.board.qna.domain.enums.QnaStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Qna {

    private Long qnaId;     // posts.post_id
    private Long boardId;   // boards.board_id
    private Long userId;    // users.user_id

    private String title;
    private String content;

    private QnaStatus status;

    private int viewCount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
