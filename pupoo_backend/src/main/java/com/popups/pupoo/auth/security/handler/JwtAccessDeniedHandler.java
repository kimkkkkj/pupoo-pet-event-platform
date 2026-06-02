// file: src/main/java/com/popups/pupoo/auth/security/handler/JwtAccessDeniedHandler.java
package com.popups.pupoo.auth.security.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;                 //  [추가] LocalDateTime 직렬화 지원
import com.fasterxml.jackson.databind.SerializationFeature;                  //  [추가] 날짜를 timestamp가 아닌 문자열로 출력
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.ErrorResponse;
import com.popups.pupoo.common.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;

import java.io.IOException;

public class JwtAccessDeniedHandler implements AccessDeniedHandler {

    //  [수정] JavaTimeModule 등록 + timestamps 비활성화 (LocalDateTime 포함 객체를 JSON으로 안전하게 직렬화)
    private final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())                           //  [추가]
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);        //  [추가]

    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {

        //  [수정] 이미 응답이 커밋(전송 시작)된 경우엔 더 이상 응답을 쓰면 충돌이 나므로 즉시 종료
        if (response.isCommitted()) {
            return; //  [수정]
        }

        //  [수정] 혹시 버퍼에 일부 써진 내용이 있다면 초기화(커밋되기 전일 때만 안전)
        response.resetBuffer(); //  [수정]

        ErrorResponse err = new ErrorResponse(
                ErrorCode.FORBIDDEN.getCode(),
                ErrorCode.FORBIDDEN.getMessage(),
                ErrorCode.FORBIDDEN.getStatus().value(),
                request.getRequestURI()
        );

        response.setStatus(ErrorCode.FORBIDDEN.getStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        //  [수정] getWriter() 대신 getOutputStream()을 사용해서 "writer vs outputstream" 충돌을 원천 차단
        mapper.writeValue(response.getOutputStream(), ApiResponse.fail(err)); //  [수정]

        //  [수정] 버퍼를 확실히 flush 해서 여기서 응답 처리를 끝냄
        response.flushBuffer(); //  [수정]
    }
}
