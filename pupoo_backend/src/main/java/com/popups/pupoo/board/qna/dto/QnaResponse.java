// file: src/main/java/com/popups/pupoo/board/qna/dto/QnaResponse.java
package com.popups.pupoo.board.qna.dto;

import com.popups.pupoo.board.qna.domain.enums.QnaStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class QnaResponse {

    private Long qnaId;
    private Long boardId;
    private Long userId;
    private String writerEmail;
    /** 작성자 닉네임 (목록·관리자 표시용) */
    private String writerNickname;

    private String title;
    private String content;

    private String answerContent;

    private LocalDateTime answeredAt;

    private QnaStatus status;

    /** posts.status — PUBLISHED(공개) / HIDDEN(숨김·마감·모더레이션 차단 등) */
    private String publicationStatus;

    /** 목록 등에서 제목·본문이 마스킹된 경우 true */
    private Boolean masked;

    /** AI 모더레이션 BLOCK으로 숨김 저장된 경우 true (작성/수정 응답에서 안내용) */
    private Boolean moderationHidden;

    private int viewCount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
