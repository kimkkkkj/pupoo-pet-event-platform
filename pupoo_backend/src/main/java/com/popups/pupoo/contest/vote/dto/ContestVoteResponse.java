// file: src/main/java/com/popups/pupoo/contest/vote/dto/ContestVoteResponse.java
package com.popups.pupoo.contest.vote.dto;

import com.popups.pupoo.contest.vote.domain.enums.VoteStatus;
import com.popups.pupoo.contest.vote.domain.model.ContestVote;

import java.time.LocalDateTime;

/**
 * 투표 응답 DTO
 */
public class ContestVoteResponse {

    public Long voteId;
    public Long programId;
    public Long programApplyId;
    public Long userId;
    public VoteStatus status;
    public LocalDateTime votedAt;
    public LocalDateTime cancelledAt;

    public static ContestVoteResponse from(ContestVote v) {
        ContestVoteResponse r = new ContestVoteResponse();
        r.voteId = v.getVoteId();
        r.programId = v.getProgramId();
        r.programApplyId = v.getProgramApplyId();
        r.userId = v.getUserId();
        r.status = v.getStatus();
        r.votedAt = v.getVotedAt();
        r.cancelledAt = v.getCancelledAt();
        return r;
    }
}
