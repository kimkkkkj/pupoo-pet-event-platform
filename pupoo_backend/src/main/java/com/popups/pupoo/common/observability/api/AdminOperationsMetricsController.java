package com.popups.pupoo.common.observability.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.observability.application.OperationsMetricsService;
import com.popups.pupoo.common.observability.dto.AdminOperationsMetricsResponse;
import com.popups.pupoo.notification.application.NotificationSseService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 운영 점검에 필요한 런타임 지표를 관리자 API로 제공한다.
 * 현재 응답은 단일 백엔드 파드 범위이며, 롤링 배포 후 카운터가 다시 시작된다.
 */
@RestController
@RequestMapping("/api/admin/operations/metrics")
public class AdminOperationsMetricsController {

    private final OperationsMetricsService operationsMetricsService;
    private final NotificationSseService notificationSseService;
    private final String instanceId;

    public AdminOperationsMetricsController(
            OperationsMetricsService operationsMetricsService,
            NotificationSseService notificationSseService,
            @Value("${HOSTNAME:local}") String instanceId
    ) {
        this.operationsMetricsService = operationsMetricsService;
        this.notificationSseService = notificationSseService;
        this.instanceId = instanceId;
    }

    /**
     * 관리자 점검 스크립트와 대시보드가 바로 사용할 수 있는 운영 지표 요약을 반환한다.
     */
    @GetMapping
    public ApiResponse<AdminOperationsMetricsResponse> summary() {
        return ApiResponse.success(
                operationsMetricsService.buildSummary(instanceId, notificationSseService.activeConnectionCount())
        );
    }
}
