// file: src/main/java/com/popups/pupoo/board/faq/dto/FaqDetailResponse.java
package com.popups.pupoo.board.faq.dto;

import java.time.LocalDateTime;

public class FaqDetailResponse {

    private Long postId;
    private String title;
    private String content;

    private String answerContent;
    private LocalDateTime answeredAt;

    private Long writerId;
    private int viewCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public FaqDetailResponse(Long postId, String title, String content,
                             String answerContent, LocalDateTime answeredAt,
                             Long writerId, int viewCount,
                             LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.postId = postId;
        this.title = title;
        this.content = content;
        this.answerContent = answerContent;
        this.answeredAt = answeredAt;
        this.writerId = writerId;
        this.viewCount = viewCount;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getPostId() { return postId; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public String getAnswerContent() { return answerContent; }
    public LocalDateTime getAnsweredAt() { return answeredAt; }
    public Long getWriterId() { return writerId; }
    public int getViewCount() { return viewCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
