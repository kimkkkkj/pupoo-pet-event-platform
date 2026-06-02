// file: src/main/java/com/popups/pupoo/report/dto/AdminReportDetailResponse.java
package com.popups.pupoo.report.dto;

import com.popups.pupoo.report.domain.model.ContentReport;

import java.time.LocalDateTime;

/**
 * 관리자 신고 상세 응답.
 * - 정책(A): 신고 대상의 "현재 상태"(targetStatus)를 포함한다.
 */
public class AdminReportDetailResponse {

    private Long reportId;
    private Long reporterUserId;
    private String targetType;
    private Long targetId;
    private String targetTitle;
    private String targetPath;
    private String targetStatus;
    private String reasonCode;
    private String reasonLabel;
    private String reasonDetail;
    private String reason;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    private Long resolvedByAdminId;
    private long totalReportCount;
    private long pendingReportCount;

    public static AdminReportDetailResponse from(ContentReport r,
                                                 String targetTitle,
                                                 String targetPath,
                                                 String targetStatus,
                                                 long totalReportCount,
                                                 long pendingReportCount) {
        AdminReportDetailResponse dto = new AdminReportDetailResponse();
        dto.reportId = r.getReportId();
        dto.reporterUserId = r.getReporterUserId();
        dto.targetType = (r.getTargetType() == null) ? null : r.getTargetType().name();
        dto.targetId = r.getTargetId();
        dto.targetTitle = targetTitle;
        dto.targetPath = targetPath;
        dto.targetStatus = targetStatus;

        dto.reasonCode = (r.getReasonCode() == null) ? null : r.getReasonCode().name();
        dto.reasonLabel = (r.getReasonCode() == null) ? null : r.getReasonCode().getLabel();
        dto.reasonDetail = r.getReasonDetail();
        dto.reason = r.getReason();
        dto.status = (r.getStatus() == null) ? null : r.getStatus().name();
        dto.createdAt = r.getCreatedAt();
        dto.resolvedAt = r.getResolvedAt();
        dto.resolvedByAdminId = r.getResolvedByAdminId();
        dto.totalReportCount = totalReportCount;
        dto.pendingReportCount = pendingReportCount;
        return dto;
    }

    public Long getReportId() { return reportId; }
    public Long getReporterUserId() { return reporterUserId; }
    public String getTargetType() { return targetType; }
    public Long getTargetId() { return targetId; }
    public String getTargetTitle() { return targetTitle; }
    public String getTargetPath() { return targetPath; }
    public String getTargetStatus() { return targetStatus; }
    public String getReasonCode() { return reasonCode; }
    public String getReasonLabel() { return reasonLabel; }
    public String getReasonDetail() { return reasonDetail; }
    public String getReason() { return reason; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public Long getResolvedByAdminId() { return resolvedByAdminId; }
    public long getTotalReportCount() { return totalReportCount; }
    public long getPendingReportCount() { return pendingReportCount; }
}
