// file: src/main/java/com/popups/pupoo/program/speaker/api/SpeakerAdminController.java
package com.popups.pupoo.program.speaker.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.MessageResponse;
import com.popups.pupoo.common.audit.annotation.AdminAudit;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.program.speaker.application.SpeakerAdminService;
import com.popups.pupoo.program.speaker.dto.SpeakerCreateRequest;
import com.popups.pupoo.program.speaker.dto.SpeakerResponse;
import com.popups.pupoo.program.speaker.dto.SpeakerUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 연사 관리자 API
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/speakers")
public class SpeakerAdminController {

    private final SpeakerAdminService speakerAdminService;

    @PostMapping
    @AdminAudit(action = "SPEAKER_CREATE", targetType = AdminTargetType.OTHER, targetIdSpel = "#result.data.speakerId")
    public ApiResponse<SpeakerResponse> createSpeaker(@RequestBody SpeakerCreateRequest req) {
        return ApiResponse.success(speakerAdminService.createSpeaker(req));
    }

    @PatchMapping("/{speakerId}")
    @AdminAudit(action = "SPEAKER_UPDATE", targetType = AdminTargetType.OTHER, targetIdSpel = "#speakerId")
    public ApiResponse<SpeakerResponse> updateSpeaker(@PathVariable("speakerId") Long speakerId,
                                                      @RequestBody SpeakerUpdateRequest req) {
        return ApiResponse.success(speakerAdminService.updateSpeaker(speakerId, req));
    }

    @DeleteMapping("/{speakerId}")
    @AdminAudit(action = "SPEAKER_DELETE", targetType = AdminTargetType.OTHER, targetIdSpel = "#speakerId")
    public ApiResponse<MessageResponse> deleteSpeaker(@PathVariable("speakerId") Long speakerId) {
        // Keep a non-null payload per SSOT response policy.
        speakerAdminService.deleteSpeaker(speakerId);
        return ApiResponse.success(new MessageResponse("SPEAKER_DELETED:" + speakerId));
    }
}
