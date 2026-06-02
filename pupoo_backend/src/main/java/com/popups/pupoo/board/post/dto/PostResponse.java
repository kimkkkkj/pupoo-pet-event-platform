// file: src/main/java/com/popups/pupoo/board/post/dto/PostResponse.java
package com.popups.pupoo.board.post.dto;

import com.popups.pupoo.board.post.domain.enums.PostStatus;
import com.popups.pupoo.board.post.domain.model.Post;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class PostResponse {
    private Long postId;
    private Long boardId;
    private Long userId;
    private String writerEmail;
    private String writerNickname;
    private String postTitle;
    private String content;
    private PostStatus status;
    private int viewCount;
    private Long commentCount;
    private boolean deleted;
    private boolean commentEnabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private PostModerationResponse moderation;

    public static PostResponse from(Post post) {
        return from(post, null);
    }

    public static PostResponse from(Post post, String writerEmail) {
        return from(post, writerEmail, null, null, null);
    }

    /** 마스킹된 제목·내용으로 응답 (5단계 노출 시점 마스킹) */
    public static PostResponse from(Post post, String writerEmail, String writerNickname, String maskedTitle, String maskedContent) {
        return from(post, writerEmail, writerNickname, maskedTitle, maskedContent, null);
    }

    /** 목록 표시용: commentCount까지 함께 응답 */
    public static PostResponse from(
            Post post,
            String writerEmail,
            String writerNickname,
            String maskedTitle,
            String maskedContent,
            Long commentCount
    ) {
        return from(post, writerEmail, writerNickname, maskedTitle, maskedContent, commentCount, null);
    }

    public static PostResponse from(
            Post post,
            String writerEmail,
            String writerNickname,
            String maskedTitle,
            String maskedContent,
            Long commentCount,
            PostModerationResponse moderation
    ) {
        PostResponse r = new PostResponse();
        r.postId = post.getPostId();
        r.boardId = post.getBoard().getBoardId();
        r.userId = post.getUserId();
        r.writerEmail = writerEmail;
        r.writerNickname = writerNickname;
        r.postTitle = maskedTitle != null ? maskedTitle : post.getPostTitle();
        r.content = maskedContent != null ? maskedContent : post.getContent();
        r.status = post.getStatus();
        r.viewCount = post.getViewCount();
        r.commentCount = commentCount;
        r.deleted = post.isDeleted();
        r.commentEnabled = post.isCommentEnabled();
        r.createdAt = post.getCreatedAt();
        r.updatedAt = post.getUpdatedAt();
        r.moderation = moderation;
        return r;
    }
}
