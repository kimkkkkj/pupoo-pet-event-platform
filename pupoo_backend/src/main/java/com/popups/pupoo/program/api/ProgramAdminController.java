// file: src/main/java/com/popups/pupoo/program/api/ProgramAdminController.java
package com.popups.pupoo.program.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.audit.annotation.AdminAudit;
import com.popups.pupoo.program.application.ProgramAdminService;
import com.popups.pupoo.program.dto.ProgramCreateRequest;
import com.popups.pupoo.program.dto.ProgramUpdateRequest;
import com.popups.pupoo.program.dto.ProgramResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/programs")
@RequiredArgsConstructor
public class ProgramAdminController {

    private final ProgramAdminService programAdminService;

    @AdminAudit
    @PostMapping
    public ResponseEntity<ApiResponse<ProgramResponse>> create(
            @RequestBody ProgramCreateRequest request) {
        ProgramResponse response = programAdminService.createProgram(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @AdminAudit
    @PatchMapping("/{programId}")
    public ResponseEntity<ApiResponse<ProgramResponse>> update(
            @PathVariable Long programId,
            @RequestBody ProgramUpdateRequest request) {
        ProgramResponse response = programAdminService.updateProgram(programId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @AdminAudit
    @DeleteMapping("/{programId}")
    public ResponseEntity<ApiResponse<ProgramResponse>> delete(
            @PathVariable Long programId) {
        ProgramResponse response = programAdminService.deleteProgram(programId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
