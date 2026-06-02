// file: src/main/java/com/popups/pupoo/report/domain/model/ContentReport.java
package com.popups.pupoo.report.domain.model;

import com.popups.pupoo.report.domain.enums.ReportStatus;
import com.popups.pupoo.report.domain.enums.ReportTargetType;
import com.popups.pupoo.report.domain.enums.ReportReasonCode;
import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * 신고 엔티티.
 * - 운영정책: 중복 신고 방지(uk_report_unique)
 * - 데모/운영 공용: 신고 사유와 처리 상태를 admin에서 관리한다.
 */
@Entity
@Table(
        name = "content_reports",
        uniqueConstraints = @UniqueConstraint(name = "uk_report_unique", columnNames = {"reporter_user_id", "target_type", "target_id"}),
        indexes = {
                @Index(name = "ix_reports_target", columnList = "target_type,target_id,status"),
                @Index(name = "ix_reports_status_created_at", columnList = "status,created_at")
        }
)
public class ContentReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id", nullable = false)
    private Long reportId;

    @Column(name = "reporter_user_id", nullable = false)
    private Long reporterUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 30)
    private ReportTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_code", nullable = false, length = 30)
    private ReportReasonCode reasonCode;

    @Column(name = "reason_detail", length = 255)
    private String reasonDetail;

    @Column(name = "reason", nullable = false, length = 255)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ReportStatus status = ReportStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolved_by_admin_id")
    private Long resolvedByAdminId;

    protected ContentReport() {}

    public static ContentReport pending(Long reporterUserId,
                                        ReportTargetType targetType,
                                        Long targetId,
                                        ReportReasonCode reasonCode,
                                        String reasonDetail) {
        ContentReport r = new ContentReport();
        r.reporterUserId = reporterUserId;
        r.targetType = targetType;
        r.targetId = targetId;

        // 정책: reason_code(드롭다운) + reason_detail(선택)을 구조화해서 저장한다.
        r.reasonCode = reasonCode;
        r.reasonDetail = (reasonDetail == null || reasonDetail.isBlank()) ? null : reasonDetail.trim();

        // legacy(reason): 운영/관리자 화면에서 빠르게 보기 위한 문자열. (DB 정합성: NOT NULL)
        r.reason = buildLegacyReason(reasonCode, r.reasonDetail);

        r.status = ReportStatus.PENDING;
        r.createdAt = LocalDateTime.now();
        return r;
    }

    private static String buildLegacyReason(ReportReasonCode code, String detail) {
        if (code == null) return "";
        if (detail == null || detail.isBlank()) return code.getLabel();
        return code.getLabel() + " | " + detail.trim();
    }

    public void accept(Long adminUserId) {
        this.status = ReportStatus.ACCEPTED;
        this.resolvedAt = LocalDateTime.now();
        this.resolvedByAdminId = adminUserId;
    }

    public void reject(Long adminUserId) {
        this.status = ReportStatus.REJECTED;
        this.resolvedAt = LocalDateTime.now();
        this.resolvedByAdminId = adminUserId;
    }

    // getters
    public Long getReportId() { return reportId; }
    public Long getReporterUserId() { return reporterUserId; }
    public ReportTargetType getTargetType() { return targetType; }
    public Long getTargetId() { return targetId; }
    public ReportReasonCode getReasonCode() { return reasonCode; }
    public String getReasonDetail() { return reasonDetail; }
    public String getReason() { return reason; }
    public ReportStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public Long getResolvedByAdminId() { return resolvedByAdminId; }
}
