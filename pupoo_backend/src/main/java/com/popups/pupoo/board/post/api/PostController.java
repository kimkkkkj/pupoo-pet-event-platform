// file: src/main/java/com/popups/pupoo/board/post/api/PostController.java
package com.popups.pupoo.board.post.api;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.board.boardinfo.domain.enums.BoardType;
import com.popups.pupoo.board.post.application.PostService;
import com.popups.pupoo.board.post.dto.PostCreateRequest;
import com.popups.pupoo.board.post.dto.PostResponse;
import com.popups.pupoo.board.post.dto.PostUpdateRequest;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.IdResponse;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.report.application.ReportService;
import com.popups.pupoo.report.dto.ReportCreateRequest;
import com.popups.pupoo.report.dto.ReportResponse;
import com.popups.pupoo.common.search.SearchType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

/**
 * 게시글 API
 *
 * 공개 정책
 * - GET 조회는 PUBLISHED + deleted=false만 허용한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;
    private final SecurityUtil securityUtil;
    private final ReportService reportService;

    /**
     * 게시글 목록 조회(공개)
     */
    @GetMapping
    public ApiResponse<Page<PostResponse>> getPosts(@RequestParam(required = false) Long boardId,
                                                    @RequestParam(required = false) String boardType,
                                                    @RequestParam(required = false) String searchType,
                                                    @RequestParam(required = false) String keyword,
                                                    @RequestParam(required = false) String sortKey,
                                                    Pageable pageable) {
        return ApiResponse.success(postService.getPublicPosts(
                boardId,
                parseBoardType(boardType),
                SearchType.from(searchType),
                keyword,
                pageable,
                sortKey
        ));
    }

    /**
     * 게시글 상세 조회(공개)
     */
    @GetMapping("/{postId}")
    public ApiResponse<PostResponse> getPost(@PathVariable Long postId) {
        return ApiResponse.success(postService.getPublicPost(postId));
    }

    /**
     * 게시글 신고(사용자)
     */
    @PostMapping("/{postId}/report")
    public ApiResponse<ReportResponse> reportPost(@PathVariable Long postId,
                                                  @Valid @RequestBody ReportCreateRequest req) {
        return ApiResponse.success(reportService.reportPost(postId, req.getReasonCode(), req.getReasonDetail()));
    }

    /**
     * 게시글 작성(인증 필요)
     */
    @PostMapping
    public ApiResponse<PostResponse> createPost(@RequestBody PostCreateRequest req) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(postService.createPost(userId, req));
    }

    /**
     * 게시글 수정(인증 필요)
     */
    @PutMapping("/{postId}")
    public ApiResponse<PostResponse> updatePost(@PathVariable Long postId, @RequestBody PostUpdateRequest req) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(postService.updatePost(userId, postId, req));
    }

    /**
     * 게시글 삭제(인증 필요)
     */
    @DeleteMapping("/{postId}")
    public ApiResponse<IdResponse> deletePost(@PathVariable Long postId) {
        Long userId = securityUtil.currentUserId();
        postService.deletePost(userId, postId);
        return ApiResponse.success(new IdResponse(postId));
    }

    /**
     * 게시글 모집 종료(인증 필요)
     */
    @PatchMapping("/{postId}/close")
    public ApiResponse<PostResponse> closePost(@PathVariable Long postId) {
        Long userId = securityUtil.currentUserId();
        postService.closePost(userId, postId);
        return ApiResponse.success(postService.getPublicPost(postId));
    }

    private BoardType parseBoardType(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return BoardType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "invalid boardType: " + raw);
        }
    }

}
