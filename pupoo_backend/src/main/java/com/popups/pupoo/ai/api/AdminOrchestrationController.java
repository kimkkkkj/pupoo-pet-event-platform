package com.popups.pupoo.ai.api;

import com.popups.pupoo.ai.application.AdminOrchestrationQueryService;
import com.popups.pupoo.ai.dto.AdminOrchestrationCapabilitiesResponse;
import com.popups.pupoo.ai.dto.AdminOrchestrationSummaryResponse;
import com.popups.pupoo.common.api.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/ai")
public class AdminOrchestrationController {

    private final AdminOrchestrationQueryService adminOrchestrationQueryService;

    public AdminOrchestrationController(AdminOrchestrationQueryService adminOrchestrationQueryService) {
        this.adminOrchestrationQueryService = adminOrchestrationQueryService;
    }

    @GetMapping("/summary")
    public ApiResponse<AdminOrchestrationSummaryResponse> summary() {
        return ApiResponse.success(adminOrchestrationQueryService.summary());
    }

    @GetMapping("/capabilities")
    public ApiResponse<AdminOrchestrationCapabilitiesResponse> capabilities() {
        return ApiResponse.success(adminOrchestrationQueryService.capabilities());
    }
}
