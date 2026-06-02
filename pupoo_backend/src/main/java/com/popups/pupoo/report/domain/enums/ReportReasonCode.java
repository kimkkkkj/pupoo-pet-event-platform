// file: src/main/java/com/popups/pupoo/report/domain/enums/ReportReasonCode.java
package com.popups.pupoo.report.domain.enums;

/**
 * 신고 사유 코드(프론트 드롭다운용).
 * - 정책: 프론트는 code로 전송하고, 백엔드는 label을 제공한다.
 * - 정책: OTHER일 때만 reasonDetail을 필수로 받는다.
 */
public enum ReportReasonCode {

    SPAM("스팸/광고/도배"),
    ABUSE("욕설/비방/괴롭힘"),
    HATE("혐오/차별"),
    SEXUAL("음란/성적 콘텐츠"),
    VIOLENCE("폭력/위협"),
    PRIVACY("개인정보 노출"),
    FRAUD("사기/사칭/허위정보"),
    COPYRIGHT("저작권 침해"),
    OTHER("기타");

    private final String label;

    ReportReasonCode(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
