// file: src/main/java/com/popups/pupoo/contest/vote/dto/ContestVoteResultResponse.java
package com.popups.pupoo.contest.vote.dto;

import java.util.List;

public record ContestVoteResultResponse(
        Long programId,
        long totalVotes,
        List<Item> results,
        Long myProgramApplyId   //  내가 투표한 후보 (없으면 null)
) {
    public record Item(Long programApplyId, long voteCount) {}
}
