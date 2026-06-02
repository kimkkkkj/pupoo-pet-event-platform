// file: src/main/java/com/popups/pupoo/program/api/ProgramSpeakerController.java
package com.popups.pupoo.program.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.program.speaker.application.SpeakerService;
import com.popups.pupoo.program.speaker.dto.SpeakerResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/programs/{programId}/speakers")
public class ProgramSpeakerController {

    private final SpeakerService speakerService;

    // 프로그램의 연사 목록 조회
    @GetMapping
    public ApiResponse<List<SpeakerResponse>> getProgramSpeakers(
            @PathVariable("programId") Long programId
    ) {
        return ApiResponse.success(
                speakerService.getSpeakersByProgram(programId)
        );
    }

    // 프로그램의 특정 연사 조회
    @GetMapping("/{speakerId}")
    public ApiResponse<SpeakerResponse> getProgramSpeaker(
            @PathVariable("programId") Long programId,
            @PathVariable("speakerId") Long speakerId
    ) {
        return ApiResponse.success(
                speakerService.getSpeakerByProgram(programId, speakerId)
        );
    }
}
