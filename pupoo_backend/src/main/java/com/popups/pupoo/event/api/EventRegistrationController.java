// file: src/main/java/com/popups/pupoo/event/api/EventRegistrationController.java
package com.popups.pupoo.event.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.IdResponse;
import com.popups.pupoo.common.api.PageResponse;
import com.popups.pupoo.event.application.EventRegistrationService;
import com.popups.pupoo.event.dto.EventApplyRequest;
import com.popups.pupoo.event.dto.EventRegistrationResponse;
import com.popups.pupoo.auth.security.util.SecurityUtil;

import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

/**
 * 사용자용 참가 신청 API
 * - POST   /api/event-registrations
 * - DELETE /api/event-registrations/{applyId}
 * - GET    /api/users/me/event-registrations
 */
@RestController
public class EventRegistrationController {

    private final EventRegistrationService registrationService;
    private final SecurityUtil securityUtil;

    public EventRegistrationController(EventRegistrationService registrationService, SecurityUtil securityUtil) {
        this.registrationService = registrationService;
        this.securityUtil = securityUtil;
    }

    @PostMapping("/api/event-registrations")
    public ApiResponse<EventRegistrationResponse> apply(@RequestBody EventApplyRequest request) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(registrationService.apply(request.getEventId(), userId));
    }

    @DeleteMapping("/api/event-registrations/{applyId}")
    public ApiResponse<IdResponse> cancel(@PathVariable("applyId") Long applyId){
        Long userId = securityUtil.currentUserId();
        registrationService.cancel(applyId, userId);
        return ApiResponse.success(new IdResponse(applyId));
    }

    @GetMapping("/api/users/me/event-registrations")
    public ApiResponse<PageResponse<EventRegistrationResponse>> myRegistrations(Pageable pageable) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(PageResponse.from(registrationService.getMyRegistrations(userId, pageable)));
    }
}
