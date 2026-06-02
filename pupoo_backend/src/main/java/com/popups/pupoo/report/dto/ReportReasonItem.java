// file: src/main/java/com/popups/pupoo/report/dto/ReportReasonItem.java
package com.popups.pupoo.report.dto;

import com.popups.pupoo.report.domain.enums.ReportReasonCode;

/**
 * 신고 사유 드롭다운 항목.
 */
public class ReportReasonItem {

    private String code;
    private String label;

    public static ReportReasonItem from(ReportReasonCode c) {
        ReportReasonItem dto = new ReportReasonItem();
        dto.code = c.name();
        dto.label = c.getLabel();
        return dto;
    }

    public String getCode() { return code; }
    public String getLabel() { return label; }
}
