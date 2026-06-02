// file: src/main/java/com/popups/pupoo/contest/vote/persistence/ContestVoteRepository.java
package com.popups.pupoo.contest.vote.persistence;

import com.popups.pupoo.contest.vote.domain.enums.VoteStatus;
import com.popups.pupoo.contest.vote.domain.model.ContestVote;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ContestVoteRepository extends JpaRepository<ContestVote, Long> {

    Optional<ContestVote> findFirstByProgramIdAndUserIdAndStatus(Long programId, Long userId, VoteStatus status);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update ContestVote v
           set v.status = com.popups.pupoo.contest.vote.domain.enums.VoteStatus.CANCELLED,
               v.cancelledAt = CURRENT_TIMESTAMP
         where v.programId = :programId
           and v.userId = :userId
           and v.status = com.popups.pupoo.contest.vote.domain.enums.VoteStatus.ACTIVE
    """)
    int cancelActiveVote(@Param("programId") Long programId, @Param("userId") Long userId);

    @Query("""
        select v.programApplyId as programApplyId, count(v.voteId) as voteCount
          from ContestVote v
         where v.programId = :programId
           and v.status = com.popups.pupoo.contest.vote.domain.enums.VoteStatus.ACTIVE
         group by v.programApplyId
         order by count(v.voteId) desc
    """)
    List<VoteCountView> countActiveVotesByProgramApply(@Param("programId") Long programId);

    @Query("""
        select count(v.voteId)
          from ContestVote v
         where v.programId = :programId
           and v.status = com.popups.pupoo.contest.vote.domain.enums.VoteStatus.ACTIVE
    """)
    long countActiveVotes(@Param("programId") Long programId);

    interface VoteCountView {
        Long getProgramApplyId();
        Long getVoteCount();
    }
}
