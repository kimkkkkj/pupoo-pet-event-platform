// file: src/main/java/com/popups/pupoo/common/api/ApiResponse.java
package com.popups.pupoo.common.api;

import java.util.List;

public class ApiResponse<T> {

    private boolean success;
    private String message;
    private String errorCode;
    private List<FieldErrorItem> invalidFields;
    private T data;
    private ErrorResponse error;

    public ApiResponse() {}

    private ApiResponse(boolean success,
                        String message,
                        String errorCode,
                        List<FieldErrorItem> invalidFields,
                        T data,
                        ErrorResponse error) {
        this.success = success;
        this.message = message;
        this.errorCode = errorCode;
        this.invalidFields = invalidFields;
        this.data = data;
        this.error = error;
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, null, null, List.of(), data, null);
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, message, null, List.of(), data, null);
    }

    public static <T> ApiResponse<T> fail(ErrorResponse error) {
        return new ApiResponse<>(
                false,
                error == null ? null : error.getMessage(),
                error == null ? null : error.getCode(),
                error == null || error.getFieldErrors() == null ? List.of() : error.getFieldErrors(),
                null,
                error
        );
    }

    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public String getErrorCode() { return errorCode; }
    public List<FieldErrorItem> getInvalidFields() { return invalidFields; }
    public T getData() { return data; }
    public ErrorResponse getError() { return error; }

    public void setSuccess(boolean success) { this.success = success; }
    public void setMessage(String message) { this.message = message; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }
    public void setInvalidFields(List<FieldErrorItem> invalidFields) { this.invalidFields = invalidFields; }
    public void setData(T data) { this.data = data; }
    public void setError(ErrorResponse error) { this.error = error; }
}
