// file: src/main/java/com/popups/pupoo/board/qna/api/AdminQnaController.java
package com.popups.pupoo.board.qna.api;

import com.popups.pupoo.board.post.domain.enums.PostStatus;
import com.popups.pupoo.board.qna.application.QnaAdminService;
import com.popups.pupoo.board.qna.dto.QnaAnswerRequest;
import com.popups.pupoo.board.qna.dto.QnaVisibilityRequest;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.MessageResponse;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 관리자 QnA 답변 API다.
 * 관리자 인증이 전제되며, 답변 작성과 답변 삭제를 `QnaAdminService`에 위임한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/qnas")
public class AdminQnaController {

    private final QnaAdminService qnaAdminService;

    /**
     * 관리자 답변을 저장한다.
     * 응답은 비어 있지 않은 payload를 유지하는 현재 응답 정책을 따른다.
     */
    @PutMapping("/{qnaId}/answer")
    public ApiResponse<MessageResponse> writeAnswer(@PathVariable Long qnaId, @Valid @RequestBody QnaAnswerRequest request) {
        qnaAdminService.writeAnswer(qnaId, request.getAnswerContent());
        return ApiResponse.success(new MessageResponse("QNA_ANSWERED:" + qnaId));
    }

    /**
     * 관리자 답변을 제거한다.
     */
    @DeleteMapping("/{qnaId}/answer")
    public ApiResponse<MessageResponse> clearAnswer(@PathVariable Long qnaId) {
        qnaAdminService.clearAnswer(qnaId);
        return ApiResponse.success(new MessageResponse("QNA_ANSWER_CLEARED:" + qnaId));
    }

    /**
     * QnA 공개 / 숨김 상태 변경 (posts.status).
     */
    @PatchMapping("/{qnaId}/visibility")
    public ApiResponse<MessageResponse> setVisibility(
            @PathVariable Long qnaId,
            @Valid @RequestBody QnaVisibilityRequest request) {
        PostStatus status = parsePublicationStatus(request.getPublicationStatus());
        qnaAdminService.setPublicationStatus(qnaId, status);
        return ApiResponse.success(new MessageResponse("QNA_VISIBILITY:" + qnaId + ":" + status.name()));
    }

    private static PostStatus parsePublicationStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "publicationStatus가 필요합니다.");
        }
        String u = raw.trim().toUpperCase();
        if ("PUBLISHED".equals(u)) {
            return PostStatus.PUBLISHED;
        }
        if ("HIDDEN".equals(u)) {
            return PostStatus.HIDDEN;
        }
        throw new BusinessException(ErrorCode.VALIDATION_FAILED, "publicationStatus는 PUBLISHED 또는 HIDDEN만 허용됩니다.");
    }
}
