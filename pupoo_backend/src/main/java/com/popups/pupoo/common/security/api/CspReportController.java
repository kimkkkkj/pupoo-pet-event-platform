package com.popups.pupoo.common.security.api;

import com.popups.pupoo.common.security.application.CspReportService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/security")
public class CspReportController {

    private final CspReportService cspReportService;

    public CspReportController(CspReportService cspReportService) {
        this.cspReportService = cspReportService;
    }

    @PostMapping(path = "/csp/report", consumes = "*/*")
    public ResponseEntity<Void> accept(
            @RequestBody(required = false) String body,
            @RequestHeader(value = HttpHeaders.CONTENT_TYPE, required = false) String contentType,
            @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent,
            @RequestHeader(value = HttpHeaders.REFERER, required = false) String referer,
            HttpServletRequest request
    ) {
        cspReportService.accept(contentType, body, userAgent, referer, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
