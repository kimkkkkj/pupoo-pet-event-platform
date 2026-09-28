package com.popups.pupoo.common.demo;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.List;

/**
 * 공개 데모(demo.mode=true)에서 되돌릴 수 없거나 외부로 나가는 관리자 기능을 막는다.
 * 실제 PG 환불, 전체 알림 발송, 회원 삭제가 대상이며 나머지 기능은 그대로 동작한다.
 */
public class DemoModeInterceptor implements HandlerInterceptor {

    private record BlockedApi(HttpMethod method, String pattern) {}

    private static final List<BlockedApi> BLOCKED_APIS = List.of(
            // 결제 환불(PG 결제 취소 호출)
            new BlockedApi(HttpMethod.POST, "/api/admin/dashboard/payments/{paymentId}/refund"),
            new BlockedApi(HttpMethod.POST, "/api/admin/dashboard/payments/bulk-refund"),
            new BlockedApi(HttpMethod.PATCH, "/api/admin/refunds/{refundId}/approve"),
            new BlockedApi(HttpMethod.POST, "/api/admin/refunds/{refundId}/execute"),
            // 회원에게 실제로 나가는 알림 발송
            new BlockedApi(HttpMethod.POST, "/api/admin/notifications/{adminNotificationId}/send"),
            new BlockedApi(HttpMethod.POST, "/api/admin/notifications/event"),
            new BlockedApi(HttpMethod.POST, "/api/admin/notifications/broadcast"),
            // 회원 삭제
            new BlockedApi(HttpMethod.DELETE, "/api/admin/users/{id}")
    );

    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String method = request.getMethod();
        String path = request.getRequestURI().substring(request.getContextPath().length());
        for (BlockedApi api : BLOCKED_APIS) {
            if (api.method().matches(method) && pathMatcher.match(api.pattern(), path)) {
                throw new BusinessException(ErrorCode.DEMO_RESTRICTED);
            }
        }
        return true;
    }
}
