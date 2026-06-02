// file: src/main/java/com/popups/pupoo/board/faq/dto/FaqListResponse.java
package com.popups.pupoo.board.faq.dto;

import java.time.LocalDateTime;

public class FaqListResponse {

    private Long postId;
    private String title;
    private int viewCount;
    private LocalDateTime createdAt;

    public FaqListResponse(Long postId, String title, int viewCount, LocalDateTime createdAt) {
        this.postId = postId;
        this.title = title;
        this.viewCount = viewCount;
        this.createdAt = createdAt;
    }

    public Long getPostId() { return postId; }
    public String getTitle() { return title; }
    public int getViewCount() { return viewCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
