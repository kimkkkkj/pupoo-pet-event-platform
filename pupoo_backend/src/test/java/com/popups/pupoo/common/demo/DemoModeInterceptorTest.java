package com.popups.pupoo.common.demo;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DemoModeInterceptorTest {

    private final DemoModeInterceptor interceptor = new DemoModeInterceptor();

    private boolean call(String method, String uri) {
        return interceptor.preHandle(new MockHttpServletRequest(method, uri), new MockHttpServletResponse(), new Object());
    }

    @Test
    void blocksRefundBroadcastAndUserDelete() {
        for (String[] req : new String[][]{
                {"POST", "/api/admin/dashboard/payments/10/refund"},
                {"POST", "/api/admin/dashboard/payments/bulk-refund"},
                {"PATCH", "/api/admin/refunds/3/approve"},
                {"POST", "/api/admin/refunds/3/execute"},
                {"POST", "/api/admin/notifications/7/send"},
                {"POST", "/api/admin/notifications/event"},
                {"POST", "/api/admin/notifications/broadcast"},
                {"DELETE", "/api/admin/users/5"},
        }) {
            assertThatThrownBy(() -> call(req[0], req[1]))
                    .as(req[0] + " " + req[1])
                    .isInstanceOf(BusinessException.class)
                    .extracting(e -> ((BusinessException) e).getErrorCode())
                    .isEqualTo(ErrorCode.DEMO_RESTRICTED);
        }
    }

    @Test
    void allowsOtherAdminApis() {
        assertThat(call("GET", "/api/admin/users")).isTrue();
        assertThat(call("GET", "/api/admin/refunds/3")).isTrue();
        assertThat(call("PATCH", "/api/admin/refunds/3/reject")).isTrue();
        assertThat(call("POST", "/api/admin/notifications")).isTrue();
        assertThat(call("DELETE", "/api/admin/notices/1")).isTrue();
        assertThat(call("POST", "/api/admin/dashboard/events/bulk-delete")).isTrue();
    }
}
