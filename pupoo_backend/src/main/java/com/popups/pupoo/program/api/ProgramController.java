// file: src/main/java/com/popups/pupoo/program/api/ProgramController.java
package com.popups.pupoo.program.api;

import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.PageResponse;
import com.popups.pupoo.program.application.ProgramService;
import com.popups.pupoo.program.domain.enums.ProgramCategory;
import com.popups.pupoo.program.dto.ProgramResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ProgramController {

    private final ProgramService programService;
    
    @GetMapping("/events/{eventId}/programs")
    public ApiResponse<PageResponse<ProgramResponse>> getPrograms(
            @PathVariable("eventId") Long eventId,
            @RequestParam(value = "category", required = false) ProgramCategory category,
            Pageable pageable
    ) {
        return ApiResponse.success(programService.getPrograms(eventId, category, pageable));
    }

    @GetMapping("/programs/{programId}")
    public ApiResponse<ProgramResponse> getProgramDetail(
            @PathVariable("programId") Long programId
    ) {
        return ApiResponse.success(programService.getProgramDetail(programId));
    }

}
