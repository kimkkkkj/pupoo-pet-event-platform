// file: src/main/java/com/popups/pupoo/board/qna/api/QnaController.java
package com.popups.pupoo.board.qna.api;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.board.qna.application.QnaService;
import com.popups.pupoo.board.qna.dto.QnaCreateRequest;
import com.popups.pupoo.board.qna.dto.QnaResponse;
import com.popups.pupoo.board.qna.dto.QnaUpdateRequest;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.IdResponse;
import com.popups.pupoo.common.api.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 사용자 QnA API다.
 * QnA 작성과 수정, 삭제, 마감은 인증 사용자가 수행하고, 공개 목록과 상세는 `QnaService`로 위임한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/qnas")
public class QnaController {

    private final QnaService qnaService;
    private final SecurityUtil securityUtil;

    /**
     * QnA를 작성한다.
     * 사용자 인증이 필요하며, 응답에는 생성된 QnA 상세가 담긴다.
     */
    @PostMapping
    public ApiResponse<QnaResponse> create(@Valid @RequestBody QnaCreateRequest request) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(qnaService.create(userId, request));
    }

    /**
     * 공개 QnA 상세를 조회한다.
     */
    @GetMapping("/{qnaId}")
    public ApiResponse<QnaResponse> get(@PathVariable Long qnaId) {
        return ApiResponse.success(qnaService.get(qnaId));
    }

    /**
     * 공개 QnA 목록을 조회한다.
     * `statusFilter`는 답변 대기와 답변 완료를 나누는 조회 조건이다.
     */
    @GetMapping
    public ApiResponse<PageResponse<QnaResponse>> list(@RequestParam(defaultValue = "0") int page,
                                                       @RequestParam(defaultValue = "10") int size,
                                                       @RequestParam(required = false) String statusFilter,
                                                       @RequestParam(required = false) String keyword,
                                                       @RequestParam(required = false) String sortKey) {
        return ApiResponse.success(PageResponse.from(qnaService.list(page, size, statusFilter, keyword, sortKey)));
    }

    /**
     * 작성자 본인의 QnA를 수정한다.
     */
    @PatchMapping("/{qnaId}")
    public ApiResponse<QnaResponse> update(@PathVariable Long qnaId,
                                           @Valid @RequestBody QnaUpdateRequest request) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(qnaService.update(userId, qnaId, request));
    }

    /**
     * 작성자 본인의 QnA를 삭제한다.
     * 구현은 물리 삭제가 아니라 게시글 숨김과 soft delete를 함께 적용한다.
     */
    @DeleteMapping("/{qnaId}")
    public ApiResponse<IdResponse> delete(@PathVariable Long qnaId) {
        Long userId = securityUtil.currentUserId();
        qnaService.delete(userId, qnaId);
        return ApiResponse.success(new IdResponse(qnaId));
    }

    /**
     * 작성자 본인이 QnA를 마감한다.
     * 마감은 게시글 상태를 닫힌 상태로 바꾸는 사용자 의사 표현이다.
     */
    @PostMapping("/{qnaId}/close")
    public ApiResponse<IdResponse> close(@PathVariable Long qnaId) {
        Long userId = securityUtil.currentUserId();
        qnaService.close(userId, qnaId);
        return ApiResponse.success(new IdResponse(qnaId));
    }
}
