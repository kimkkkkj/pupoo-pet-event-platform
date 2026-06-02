// file: src/main/java/com/popups/pupoo/program/apply/api/ProgramApplyController.java
package com.popups.pupoo.program.apply.api;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.IdResponse;
import com.popups.pupoo.common.api.PageResponse;
import com.popups.pupoo.program.apply.application.ProgramApplyService;
import com.popups.pupoo.program.apply.dto.ProgramApplyRequest;
import com.popups.pupoo.program.apply.dto.ProgramApplyResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/program-applies")
public class ProgramApplyController {

    private final ProgramApplyService programApplyService;
    private final SecurityUtil securityUtil;

    @GetMapping("/my")
    public ApiResponse<PageResponse<ProgramApplyResponse>> my(Pageable pageable) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(programApplyService.getMyApplies(userId, pageable));
    }

    @GetMapping("/programs/{programId}/candidates")
    public ApiResponse<PageResponse<ProgramApplyResponse>> candidates(
            @PathVariable("programId") Long programId,
            Pageable pageable
    ) {
        return ApiResponse.success(programApplyService.getApprovedCandidates(programId, pageable));
    }

    @PostMapping
    public ApiResponse<ProgramApplyResponse> create(@RequestBody ProgramApplyRequest req) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(programApplyService.create(userId, req));
    }

    @PatchMapping("/{id}/cancel")
    public ApiResponse<IdResponse> cancel(@PathVariable("id") Long id) {
        Long userId = securityUtil.currentUserId();
        programApplyService.cancel(userId, id);
        return ApiResponse.success(new IdResponse(id));

    }

    @GetMapping("/{id}")
    public ApiResponse<ProgramApplyResponse> get(@PathVariable("id") Long id) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(programApplyService.getApply(userId, id));
    }
}
