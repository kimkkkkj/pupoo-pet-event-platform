// file: src/main/java/com/popups/pupoo/board/post/dto/PostUpdateRequest.java
package com.popups.pupoo.board.post.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PostUpdateRequest {
    private String postTitle;
    private String content;
}
