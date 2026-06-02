package com.popups.pupoo.common.api;

/**
 * Validation 오류를 프론트에서 필드 단위로 표시하기 위한 DTO다.
 */
public class FieldErrorItem {

    private String field;
    private String reason;

    public FieldErrorItem() {
    }

    public FieldErrorItem(String field, String reason) {
        this.field = field;
        this.reason = reason;
    }

    public String getField() {
        return field;
    }

    public String getReason() {
        return reason;
    }

    public void setField(String field) {
        this.field = field;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
