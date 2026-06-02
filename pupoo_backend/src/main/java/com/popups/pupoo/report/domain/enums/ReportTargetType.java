// file: src/main/java/com/popups/pupoo/report/domain/enums/ReportTargetType.java
package com.popups.pupoo.report.domain.enums;

/**
 * 신고 대상 타입.
 * DB ENUM(content_reports.target_type)과 1:1 매핑된다.
 */
public enum ReportTargetType {
    POST,
    REVIEW,
    POST_COMMENT,
    REVIEW_COMMENT,
    GALLERY
}
