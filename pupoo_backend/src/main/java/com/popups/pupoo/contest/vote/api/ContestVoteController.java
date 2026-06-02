// file: src/main/java/com/popups/pupoo/contest/vote/api/ContestVoteController.java
package com.popups.pupoo.contest.vote.api;

import org.springframework.web.bind.annotation.*;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.MessageResponse;
import com.popups.pupoo.contest.vote.application.ContestVoteService;
import com.popups.pupoo.contest.vote.dto.ContestVoteCreateResponse;
import com.popups.pupoo.contest.vote.dto.ContestVoteRequest;
import com.popups.pupoo.contest.vote.dto.ContestVoteResultResponse;

@RestController
@RequestMapping("/api/programs/{programId}/votes")
public class ContestVoteController {

    private final ContestVoteService contestVoteService;
    private final SecurityUtil securityUtil;

    public ContestVoteController(ContestVoteService contestVoteService, SecurityUtil securityUtil) {
        this.contestVoteService = contestVoteService;
        this.securityUtil = securityUtil;
    }

    @PostMapping
    public ApiResponse<ContestVoteCreateResponse> vote(
            @PathVariable("programId") Long programId,
            @RequestBody ContestVoteRequest req
    ) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(contestVoteService.vote(programId, userId, req));
    }

    @DeleteMapping
    public ApiResponse<MessageResponse> cancel(
            @PathVariable("programId") Long programId
    ) {
        Long userId = securityUtil.currentUserId();
        contestVoteService.cancel(programId, userId);
        return ApiResponse.success(new MessageResponse("VOTE_CANCELED"));
    }

    @GetMapping("/result")
    public ApiResponse<ContestVoteResultResponse> result(
            @PathVariable("programId") Long programId
    ) {
        Long userId = securityUtil.currentUserIdOrNull();
        return ApiResponse.success(contestVoteService.result(programId, userId));
    }

}
