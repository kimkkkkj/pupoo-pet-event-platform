// file: src/main/java/com/popups/pupoo/report/domain/enums/ReportStatus.java
package com.popups.pupoo.report.domain.enums;

/**
 * 신고 처리 상태.
 * DB ENUM(content_reports.status)과 1:1 매핑된다.
 */
public enum ReportStatus {
    PENDING,
    ACCEPTED,
    REJECTED
}
