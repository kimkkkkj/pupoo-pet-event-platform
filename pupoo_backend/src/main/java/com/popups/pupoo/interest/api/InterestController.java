// file: src/main/java/com/popups/pupoo/interest/api/InterestController.java
package com.popups.pupoo.interest.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.interest.application.InterestService;
import com.popups.pupoo.interest.domain.enums.InterestType;
import com.popups.pupoo.interest.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Interest API
 *
 * - GET  /api/interests                     : 관심사 목록 조회(type optional)
 * - POST /api/interests/subscribe           : 관심사 구독
 * - POST /api/interests/unsubscribe         : 관심사 구독 해제(status=CANCELLED)
 * - POST /api/interests/mysubscriptions     : 내 구독 목록(includeInactive optional)
 *
 *  참고
 * - mysubscriptions는 기존 합의대로 POST 유지(바디 없이도 가능하지만, 팀 합의 우선)
 */
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/interests")
public class InterestController {

    private final InterestService interestService;

    @GetMapping
    public ApiResponse<List<InterestResponse>> getAll(@RequestParam(required = false) InterestType type) {
        return ApiResponse.success(interestService.getAll(type));
    }

    @PostMapping("/subscribe")
    public ApiResponse<UserInterestSubscriptionResponse> subscribe(@Valid @RequestBody InterestSubscribeRequest request) {
        return ApiResponse.success(interestService.subscribe(request));
    }

    @PostMapping("/unsubscribe")
    public ApiResponse<UserInterestSubscriptionResponse> unsubscribe(@Valid @RequestBody InterestUnsubscribeRequest request) {
        return ApiResponse.success(interestService.unsubscribe(request));
    }

    @PatchMapping("/channels")
    public ApiResponse<UserInterestSubscriptionResponse> updateChannels(
            @Valid @RequestBody InterestChannelUpdateRequest request
    ) {
        return ApiResponse.success(interestService.updateChannels(request));
    }

    @PostMapping("/mysubscriptions")
    public ApiResponse<List<UserInterestSubscriptionResponse>> mySubscriptions(
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        return ApiResponse.success(interestService.mySubscriptions(includeInactive));
    }
}
