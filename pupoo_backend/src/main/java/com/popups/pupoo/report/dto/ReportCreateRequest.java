// file: src/main/java/com/popups/pupoo/report/dto/ReportCreateRequest.java
package com.popups.pupoo.report.dto;

import com.popups.pupoo.report.domain.enums.ReportReasonCode;
import jakarta.validation.constraints.NotNull;

public class ReportCreateRequest {

    /**
     * 신고 사유 코드(드롭다운).
     */
    @NotNull
    private ReportReasonCode reasonCode;

    /**
     * 기타(OTHER) 등 상세 사유.
     * - 정책: OTHER일 때만 필수(서비스 레이어에서 검증)
     */
    private String reasonDetail;

    public ReportReasonCode getReasonCode() { return reasonCode; }
    public void setReasonCode(ReportReasonCode reasonCode) { this.reasonCode = reasonCode; }
    public String getReasonDetail() { return reasonDetail; }
    public void setReasonDetail(String reasonDetail) { this.reasonDetail = reasonDetail; }
}
