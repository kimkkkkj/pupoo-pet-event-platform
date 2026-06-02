package com.popups.pupoo.common.dashboard.api;

import com.popups.pupoo.booth.dto.BoothCreateRequest;
import com.popups.pupoo.booth.dto.BoothResponse;
import com.popups.pupoo.booth.dto.BoothUpdateRequest;
import com.popups.pupoo.common.api.PageResponse;
import com.popups.pupoo.common.dashboard.application.AdminDashboardService;
import com.popups.pupoo.common.dashboard.dto.DashboardEventResponse;
import com.popups.pupoo.common.dashboard.dto.DashboardPastEventResponse;
import com.popups.pupoo.common.dashboard.dto.DashboardProgramResponse;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.MessageResponse;
import com.popups.pupoo.event.application.EventAdminService;
import com.popups.pupoo.event.dto.AdminEventCreateRequest;
import com.popups.pupoo.event.dto.AdminEventUpdateRequest;
import com.popups.pupoo.event.dto.EventResponse;
import com.popups.pupoo.program.application.ProgramAdminService;
import com.popups.pupoo.program.apply.application.ProgramApplyService;
import com.popups.pupoo.program.apply.dto.ProgramApplyResponse;
import com.popups.pupoo.program.domain.enums.ProgramCategory;
import com.popups.pupoo.program.dto.ProgramCreateRequest;
import com.popups.pupoo.program.dto.ProgramResponse;
import com.popups.pupoo.program.dto.ProgramUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService dashboardService;
    private final EventAdminService eventAdminService;
    private final ProgramAdminService programAdminService;

    // ✅ 추가: 콘테스트 신청자 관리용
    private final ProgramApplyService programApplyService;

    // ─── 행사 ────────────────────────────────
    @GetMapping("/events")
    public ApiResponse<List<DashboardEventResponse>> listEvents() {
        return ApiResponse.success(dashboardService.listEvents());
    }

    @PostMapping("/events")
    public ApiResponse<EventResponse> createEvent(@RequestBody AdminEventCreateRequest request) {
        return ApiResponse.success(eventAdminService.createEvent(request));
    }

    @PatchMapping("/events/{eventId}")
    public ApiResponse<EventResponse> updateEvent(
            @PathVariable Long eventId,
            @RequestBody AdminEventUpdateRequest request) {
        return ApiResponse.success(eventAdminService.updateEvent(eventId, request));
    }

    @DeleteMapping("/events/{eventId}")
    public ApiResponse<Map<String, Long>> deleteEvent(@PathVariable Long eventId) {
        eventAdminService.hardDeleteEvent(eventId);
        return ApiResponse.success(Map.of("deletedEventId", eventId));
    }

    @PostMapping("/events/bulk-delete")
    public ApiResponse<Map<String, Integer>> bulkDeleteEvents(@RequestBody Map<String, List<Long>> body) {
        List<Long> ids = body.getOrDefault("eventIds", List.of());
        int count = 0;
        for (Long id : ids) {
            try { eventAdminService.hardDeleteEvent(id); count++; }
            catch (Exception ignored) {}
        }
        return ApiResponse.success(Map.of("deleted", count));
    }

    // ─── 프로그램 ────────────────────────────
    @GetMapping("/programs")
    public ApiResponse<List<DashboardProgramResponse>> listPrograms() {
        return ApiResponse.success(dashboardService.listPrograms());
    }

    /** 특정 행사에 속한 프로그램 목록 */
    @GetMapping("/events/{eventId}/programs")
    public ApiResponse<List<DashboardProgramResponse>> listProgramsByEvent(
            @PathVariable Long eventId,
            @RequestParam(required = false) String category) {
        if (category != null && !category.isBlank()) {
            ProgramCategory cat = ProgramCategory.valueOf(category.toUpperCase());
            return ApiResponse.success(dashboardService.listProgramsByEventAndCategory(eventId, cat));
        }
        return ApiResponse.success(dashboardService.listProgramsByEvent(eventId));
    }

    @PostMapping("/programs")
    public ApiResponse<ProgramResponse> createProgram(@RequestBody ProgramCreateRequest request) {
        return ApiResponse.success(programAdminService.createProgram(request));
    }

    @PatchMapping("/programs/{programId}")
    public ApiResponse<ProgramResponse> updateProgram(
            @PathVariable Long programId,
            @RequestBody ProgramUpdateRequest request) {
        return ApiResponse.success(programAdminService.updateProgram(programId, request));
    }

    @DeleteMapping("/programs/{programId}")
    public ApiResponse<ProgramResponse> deleteProgram(@PathVariable Long programId) {
        return ApiResponse.success(programAdminService.deleteProgram(programId));
    }

    @PostMapping("/programs/bulk-delete")
    public ApiResponse<Map<String, Integer>> bulkDeletePrograms(@RequestBody Map<String, List<Long>> body) {
        List<Long> ids = body.getOrDefault("programIds", List.of());
        int count = 0;
        for (Long id : ids) {
            try { programAdminService.deleteProgram(id); count++; }
            catch (Exception ignored) {}
        }
        return ApiResponse.success(Map.of("deleted", count));
    }

    // ─── 콘테스트 참가 신청자 관리 (✅ 신규) ──────────────────────
    /**
     * 특정 콘테스트 프로그램의 모든 신청자 목록 (APPLIED + APPROVED + REJECTED 포함)
     * GET /api/admin/dashboard/programs/{programId}/applies
     */
    @GetMapping("/programs/{programId}/applies")
    public ApiResponse<PageResponse<ProgramApplyResponse>> listProgramApplies(
            @PathVariable Long programId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return ApiResponse.success(
                programApplyService.getAppliesByProgramForAdmin(programId, PageRequest.of(page, size))
        );
    }

    /**
     * 어드민 참가자 강제 삭제 (Hard Delete)
     * DELETE /api/admin/dashboard/program-applies/{applyId}
     */
    @DeleteMapping("/program-applies/{applyId}")
    public ApiResponse<MessageResponse> deleteApply(@PathVariable Long applyId) {
        programApplyService.adminHardDelete(applyId);
        return ApiResponse.success(new MessageResponse("PROGRAM_APPLY_DELETED"));
    }

    /**
     * 신청 상태 변경 (APPROVED / REJECTED / APPLIED)
     * PATCH /api/admin/dashboard/program-applies/{applyId}/status
     * body: { "status": "APPROVED" }
     */
    @PatchMapping("/program-applies/{applyId}/status")
    public ApiResponse<ProgramApplyResponse> updateApplyStatus(
            @PathVariable Long applyId,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        return ApiResponse.success(programApplyService.adminUpdateStatus(applyId, status));
    }

    // ─── 부스(체험존) ────────────────────────
    @GetMapping("/events/{eventId}/booths")
    public ApiResponse<List<BoothResponse>> listBoothsByEvent(@PathVariable Long eventId) {
        return ApiResponse.success(dashboardService.listBoothsByEvent(eventId));
    }

    @PostMapping("/booths")
    public ApiResponse<BoothResponse> createBooth(@RequestBody BoothCreateRequest request) {
        return ApiResponse.success(dashboardService.createBooth(request));
    }

    @PatchMapping("/booths/{boothId}")
    public ApiResponse<BoothResponse> updateBooth(
            @PathVariable Long boothId,
            @RequestBody BoothUpdateRequest request) {
        return ApiResponse.success(dashboardService.updateBooth(boothId, request));
    }

    @DeleteMapping("/booths/{boothId}")
    public ApiResponse<Map<String, Long>> deleteBooth(@PathVariable Long boothId) {
        dashboardService.deleteBooth(boothId);
        return ApiResponse.success(Map.of("deletedBoothId", boothId));
    }

    @PostMapping("/booths/bulk-delete")
    public ApiResponse<Map<String, Integer>> bulkDeleteBooths(@RequestBody Map<String, List<Long>> body) {
        List<Long> ids = body.getOrDefault("boothIds", List.of());
        int count = 0;
        for (Long id : ids) {
            try { dashboardService.deleteBooth(id); count++; }
            catch (Exception ignored) {}
        }
        return ApiResponse.success(Map.of("deleted", count));
    }

    // ─── 지난 행사 ───────────────────────────
    @GetMapping("/past-events")
    public ApiResponse<List<DashboardPastEventResponse>> listPastEvents() {
        return ApiResponse.success(dashboardService.listPastEvents());
    }
}
