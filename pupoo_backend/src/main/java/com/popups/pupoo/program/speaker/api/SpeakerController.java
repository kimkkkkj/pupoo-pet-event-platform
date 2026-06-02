// file: src/main/java/com/popups/pupoo/program/speaker/api/SpeakerController.java
package com.popups.pupoo.program.speaker.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.program.speaker.application.SpeakerService;
import com.popups.pupoo.program.speaker.dto.SpeakerResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 연사 공개 조회 API.
 *
 * 정책
 * - 비로그인(GUEST)도 조회 가능하다.
 * - 신청/관리 기능은 별도 관리자 API에서 처리한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/speakers")
public class SpeakerController {

    private final SpeakerService speakerService;

    @GetMapping
    public ApiResponse<List<SpeakerResponse>> getSpeakers() {
        return ApiResponse.success(
                speakerService.getSpeakers()
        );
    }

    @GetMapping("/{speakerId}")
    public ApiResponse<SpeakerResponse> getSpeaker(
            @PathVariable("speakerId") Long speakerId
    ) {
        return ApiResponse.success(
                speakerService.getSpeaker(speakerId)
        );
    }
}
