// file: src/main/java/com/popups/pupoo/reply/api/ReplyController.java
package com.popups.pupoo.reply.api;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.IdResponse;
import com.popups.pupoo.reply.application.ReplyService;
import com.popups.pupoo.reply.domain.enums.ReplyTargetType;
import com.popups.pupoo.reply.dto.ReplyCreateRequest;
import com.popups.pupoo.reply.dto.ReplyResponse;
import com.popups.pupoo.reply.dto.ReplyUpdateRequest;
import com.popups.pupoo.report.application.ReportService;
import com.popups.pupoo.report.dto.ReportCreateRequest;
import com.popups.pupoo.report.dto.ReportResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
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
 * 게시글/리뷰 댓글 API다.
 * 댓글 대상은 `ReplyTargetType`으로 구분하고, 작성/수정/삭제/신고 흐름을 각각 전용 서비스에 위임한다.
 */
@RestController
@RequestMapping("/api/replies")
public class ReplyController {

    private final ReplyService replyService;
    private final SecurityUtil securityUtil;
    private final ReportService reportService;

    public ReplyController(ReplyService replyService, SecurityUtil securityUtil, ReportService reportService) {
        this.replyService = replyService;
        this.securityUtil = securityUtil;
        this.reportService = reportService;
    }

    /**
     * 댓글을 작성한다.
     * 인증 사용자가 대상 콘텐츠에 댓글 작성 가능한지 확인한 뒤 `ReplyService.create`로 위임한다.
     */
    @PostMapping
    public ApiResponse<ReplyResponse> create(@Valid @RequestBody ReplyCreateRequest request) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(replyService.create(userId, request));
    }

    /**
     * 댓글 목록을 조회한다.
     * 대상 콘텐츠가 공개 상태인지 검증한 뒤 페이징 응답을 반환한다.
     */
    @GetMapping
    public ApiResponse<Page<ReplyResponse>> list(@RequestParam ReplyTargetType targetType,
                                                 @RequestParam Long targetId,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(replyService.list(targetType, targetId, page, size));
    }

    /**
     * 본인 댓글을 수정한다.
     */
    @PatchMapping("/{replyId}")
    public ApiResponse<ReplyResponse> update(@PathVariable Long replyId,
                                             @RequestParam(name = "targetType") ReplyTargetType targetType,
                                             @Valid @RequestBody ReplyUpdateRequest request) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(replyService.update(userId, targetType, replyId, request));
    }

    /**
     * 본인 댓글을 soft delete 처리한다.
     */
    @DeleteMapping("/{replyId}")
    public ApiResponse<IdResponse> delete(@PathVariable Long replyId,
                                          @RequestParam ReplyTargetType targetType) {
        Long userId = securityUtil.currentUserId();
        replyService.delete(userId, targetType, replyId);
        return ApiResponse.success(new IdResponse(replyId));
    }

    /**
     * 댓글 신고를 접수한다.
     * 신고 상태는 `content_reports`에 쌓이고, 실제 댓글 숨김은 관리자 수락 시점에 분리 처리된다.
     */
    @PostMapping("/{targetType}/{replyId}/report")
    public ApiResponse<ReportResponse> report(@PathVariable ReplyTargetType targetType,
                                              @PathVariable Long replyId,
                                              @Valid @RequestBody ReportCreateRequest req) {
        if (targetType == ReplyTargetType.POST) {
            return ApiResponse.success(reportService.reportPostComment(replyId, req.getReasonCode(), req.getReasonDetail()));
        }
        return ApiResponse.success(reportService.reportReviewComment(replyId, req.getReasonCode(), req.getReasonDetail()));
    }
}
