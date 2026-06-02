// file: src/main/java/com/popups/pupoo/board/post/api/AdminPostController.java
package com.popups.pupoo.board.post.api;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.board.post.application.PostService;
import com.popups.pupoo.board.post.dto.PostResponse;
import com.popups.pupoo.board.post.dto.PostUpdateRequest;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.MessageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/posts")
public class AdminPostController {

    private final PostService postService;
    private final SecurityUtil securityUtil;

    /**
     * 관리자가 타인이 작성한 게시글도 수정할 수 있도록 한다.
     * (일반 PUT /api/posts/{id} 는 작성자 본인만 가능)
     */
    @PutMapping("/{postId}")
    public ApiResponse<PostResponse> updatePost(@PathVariable Long postId,
                                                @Valid @RequestBody PostUpdateRequest req) {
        Long adminId = securityUtil.currentUserId();
        postService.adminUpdatePost(adminId, postId, req);
        return ApiResponse.success(postService.getPublicPost(postId));
    }

    @PatchMapping("/{postId}/delete")
    public ApiResponse<MessageResponse> delete(@PathVariable Long postId) {
        postService.adminDelete(postId);
        return ApiResponse.success(new MessageResponse("ADMIN_DELETE_OK"));
    }
}
