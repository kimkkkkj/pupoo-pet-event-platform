package com.popups.pupoo.common.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    /**
     * Local/dev smoke-test health endpoint.
     * Always returns a non-null payload in ApiResponse format.
     */
    @GetMapping("/api/health")
    public ApiResponse<String> health() {
        return ApiResponse.success("ok");
    }
}
