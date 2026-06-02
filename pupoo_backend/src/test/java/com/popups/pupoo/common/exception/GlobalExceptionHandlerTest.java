package com.popups.pupoo.common.exception;

import com.popups.pupoo.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleDataIntegrityMapsUserPhoneUniqueConstraintToDuplicatePhoneMessage() {
        HttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/signup/complete");
        DataIntegrityViolationException exception = new DataIntegrityViolationException(
                "duplicate",
                new RuntimeException("Duplicate entry '821012345678' for key 'uk_users_phone'")
        );

        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrity(exception, request);

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError()).isNotNull();
        assertThat(response.getBody().getError().getCode()).isEqualTo(ErrorCode.DUPLICATE_PHONE.getCode());
        assertThat(response.getBody().getError().getMessage()).isEqualTo("이미 가입된 전화번호입니다.");
    }
}
