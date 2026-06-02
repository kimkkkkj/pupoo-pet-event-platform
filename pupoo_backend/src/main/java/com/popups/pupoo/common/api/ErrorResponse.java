package com.popups.pupoo.common.api;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class ErrorResponse {

    private String code;
    private String message;
    private int status;
    private String path;
    private LocalDateTime timestamp;

    /**
     * Validation 오류의 필드 단위 상세 정보다.
     * 에러 응답은 항상 fieldErrors를 포함한다.
     */
    private List<FieldErrorItem> fieldErrors;

    public ErrorResponse() {}

    public ErrorResponse(String code, String message, int status, String path) {
        this.code = code;
        this.message = message;
        this.status = status;
        this.path = path;
        this.timestamp = LocalDateTime.now();
        this.fieldErrors = new ArrayList<>();
    }

    public String getCode() { return code; }
    public String getMessage() { return message; }
    public int getStatus() { return status; }
    public String getPath() { return path; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public List<FieldErrorItem> getFieldErrors() { return fieldErrors; }

    public void setCode(String code) { this.code = code; }
    public void setMessage(String message) { this.message = message; }
    public void setStatus(int status) { this.status = status; }
    public void setPath(String path) { this.path = path; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public void setFieldErrors(List<FieldErrorItem> fieldErrors) { this.fieldErrors = fieldErrors; }
}
