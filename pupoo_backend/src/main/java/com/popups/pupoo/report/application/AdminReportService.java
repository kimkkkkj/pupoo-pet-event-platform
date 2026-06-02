// file: src/main/java/com/popups/pupoo/report/application/AdminReportService.java
package com.popups.pupoo.report.application;

import com.popups.pupoo.common.audit.application.AdminLogService;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.board.boardinfo.application.AdminModerationService;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.report.domain.enums.ReportStatus;
import com.popups.pupoo.report.domain.enums.ReportTargetType;
import com.popups.pupoo.report.domain.model.ContentReport;
import com.popups.pupoo.report.dto.ReportResponse;
import com.popups.pupoo.report.persistence.ContentReportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 신고 처리 서비스.
 * - 정책: 모더레이션(숨김/블라인드) 적용 + 신고 상태 업데이트
 * - 정책: admin_logs는 쓰기 작업만 기록
 */
@Service
public class AdminReportService {

    private final SecurityUtil securityUtil;
    private final ContentReportRepository reportRepository;
    private final AdminModerationService moderationService;
    private final AdminLogService adminLogService;

    public AdminReportService(SecurityUtil securityUtil,
                              ContentReportRepository reportRepository,
                              AdminModerationService moderationService,
                              AdminLogService adminLogService) {
        this.securityUtil = securityUtil;
        this.reportRepository = reportRepository;
        this.moderationService = moderationService;
        this.adminLogService = adminLogService;
    }

    @Transactional
    public ReportResponse accept(Long reportId, String reason) {
        Long adminId = securityUtil.currentUserId();

        ContentReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // 정책(B): 멱등 처리
        // - 이미 처리된 신고에 동일 결정을 다시 요청하면, 에러가 아니라 "현재 상태"를 그대로 반환한다.
        if (report.getStatus() != ReportStatus.PENDING) {
            return ReportResponse.from(report);
        }

        // 수용(ACCEPTED) 시점에 콘텐츠에 모더레이션을 적용한다.
        applyModerationOnAccept(report, reason);

        report.accept(adminId);

        adminLogService.write(buildAction("REPORT_ACCEPT", reportId, report, reason), resolveAdminTargetType(report), resolveAdminTargetId(report));

        return ReportResponse.from(report);
    }

    @Transactional
    public ReportResponse reject(Long reportId, String reason) {
        Long adminId = securityUtil.currentUserId();

        ContentReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // 정책(B): 멱등 처리
        if (report.getStatus() != ReportStatus.PENDING) {
            return ReportResponse.from(report);
        }

        report.reject(adminId);
        adminLogService.write(buildAction("REPORT_REJECT", reportId, report, reason), resolveAdminTargetType(report), resolveAdminTargetId(report));

        return ReportResponse.from(report);
    }

    private AdminTargetType resolveAdminTargetType(ContentReport report) {
        if (report.getTargetType() == ReportTargetType.POST) return AdminTargetType.POST;
        if (report.getTargetType() == ReportTargetType.REVIEW) return AdminTargetType.REVIEW;
        if (report.getTargetType() == ReportTargetType.GALLERY) return AdminTargetType.GALLERY;
        // 댓글(POST_COMMENT/REVIEW_COMMENT)은 admin_logs enum에 REPLY가 없으므로 OTHER로 기록한다.
        return AdminTargetType.OTHER;
    }

    private Long resolveAdminTargetId(ContentReport report) {
        // 요청대로 targetId는 "실제 콘텐츠 id"를 저장한다.
        // - 댓글의 경우도 commentId를 그대로 저장하고, action에 댓글 타입을 추가로 남긴다.
        return report.getTargetId();
    }

    private String buildAction(String prefix, Long reportId, ContentReport report, String decisionReason) {
        String code = (report.getReasonCode() == null) ? "" : report.getReasonCode().name();
        String tt = (report.getTargetType() == null) ? "" : report.getTargetType().name();

        // action은 VARCHAR(255) 이므로 짧게 유지한다.
        String base = prefix + "|reportId=" + reportId + "|targetType=" + tt + "|code=" + code;
        if (decisionReason == null || decisionReason.isBlank()) return base;
        return base + "|" + decisionReason;
    }

    private void applyModerationOnAccept(ContentReport report, String reason) {
        String r = "신고 승인" + suffix(reason);

        if (report.getTargetType() == ReportTargetType.POST) {
            moderationService.hidePost(report.getTargetId(), r);
            return;
        }

        if (report.getTargetType() == ReportTargetType.REVIEW) {
            moderationService.blindReview(report.getTargetId(), r);
            return;
        }

        if (report.getTargetType() == ReportTargetType.POST_COMMENT) {
            moderationService.hideReply(com.popups.pupoo.reply.domain.enums.ReplyTargetType.POST, report.getTargetId(), r);
            return;
        }

        if (report.getTargetType() == ReportTargetType.REVIEW_COMMENT) {
            moderationService.hideReply(com.popups.pupoo.reply.domain.enums.ReplyTargetType.REVIEW, report.getTargetId(), r);
            return;
        }

        if (report.getTargetType() == ReportTargetType.GALLERY) {
            moderationService.blindGallery(report.getTargetId(), r);
        }
    }

    private String suffix(String reason) {
        if (reason == null || reason.isBlank()) return "";
        return "|" + reason;
    }
}
