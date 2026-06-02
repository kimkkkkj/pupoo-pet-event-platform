// file: src/main/java/com/popups/pupoo/board/post/dto/PostCreateRequest.java
package com.popups.pupoo.board.post.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PostCreateRequest {
    private Long boardId;
    private String postTitle;
    private String content;
}
