// file: src/main/java/com/popups/pupoo/report/dto/AdminReportDecisionRequest.java
package com.popups.pupoo.report.dto;

import jakarta.validation.constraints.NotBlank;

public class AdminReportDecisionRequest {

    /** ACCEPT or REJECT */
    @NotBlank
    private String decision;

    /** 관리자 처리 사유(옵션). admin_logs에 기록된다. */
    private String reason;

    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
