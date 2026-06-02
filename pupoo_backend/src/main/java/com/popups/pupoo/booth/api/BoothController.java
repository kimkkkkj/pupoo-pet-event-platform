// file: src/main/java/com/popups/pupoo/booth/api/BoothController.java
package com.popups.pupoo.booth.api;

import com.popups.pupoo.booth.application.BoothService;
import com.popups.pupoo.booth.domain.enums.BoothStatus;
import com.popups.pupoo.booth.domain.enums.BoothZone;
import com.popups.pupoo.booth.dto.BoothResponse;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class BoothController {

    private final BoothService boothService;

    public BoothController(BoothService boothService) {
        this.boothService = boothService;
    }

    /**
     * 행사 부스 목록 조회(상태/존 필터 가능) 페이징
     * GET /api/events/{eventId}/booths?status=OPEN&zone=ZONE_A&page=0&size=20
     */
    @GetMapping("/events/{eventId}/booths")
    public ApiResponse<PageResponse<BoothResponse>> getEventBooths(
            @PathVariable("eventId") Long eventId,
            @RequestParam(name = "status", required = false) BoothStatus status,
            @RequestParam(name = "zone", required = false) BoothZone zone,
            @PageableDefault(size = 20, sort = "boothId", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        return ApiResponse.success(
                PageResponse.from(boothService.getEventBooths(eventId, zone, status, pageable))
        );
    }

    /**
     * 부스 상세(대기/혼잡 포함) 조회
     * GET /api/booths/{boothId}
     */
    @GetMapping("/booths/{boothId}")
    public ApiResponse<BoothResponse> getBoothDetail(
            @PathVariable("boothId") Long boothId   //  이름 명시
    ) {
        return ApiResponse.success(boothService.getBoothDetail(boothId));
    }
}
