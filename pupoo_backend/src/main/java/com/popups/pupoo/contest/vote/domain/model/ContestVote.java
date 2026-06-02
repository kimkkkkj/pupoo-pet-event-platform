// file: src/main/java/com/popups/pupoo/contest/vote/domain/model/ContestVote.java
package com.popups.pupoo.contest.vote.domain.model;

import com.popups.pupoo.contest.vote.domain.enums.VoteStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "contest_votes",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_contest_votes_active",
                        columnNames = {"program_id", "user_id", "active_flag"}
                )
        },
        indexes = {
                @Index(name = "ix_contest_votes_program_id", columnList = "program_id"),
                @Index(name = "ix_contest_votes_program_apply_id", columnList = "program_apply_id"),
                @Index(name = "ix_contest_votes_user_id", columnList = "user_id"),
                @Index(name = "ix_contest_votes_program_status", columnList = "program_id,status"),
                @Index(name = "ix_contest_votes_user_status", columnList = "user_id,status")
        }
)
public class ContestVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "vote_id", nullable = false)
    private Long voteId;

    @Column(name = "program_id", nullable = false)
    private Long programId;

    @Column(name = "program_apply_id", nullable = false)
    private Long programApplyId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @CreationTimestamp
    @Column(name = "voted_at", nullable = false, updatable = false)
    private LocalDateTime votedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private VoteStatus status = VoteStatus.ACTIVE;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    //  GENERATED ALWAYS 컬럼 (직접 INSERT/UPDATE 금지)
    @Column(name = "active_flag", insertable = false, updatable = false)
    private Byte activeFlag;

    protected ContestVote() {}

    public ContestVote(Long programId, Long programApplyId, Long userId) {
        this.programId = programId;
        this.programApplyId = programApplyId;
        this.userId = userId;
        this.status = VoteStatus.ACTIVE;
        this.cancelledAt = null;
    }

    public Long getVoteId() { return voteId; }
    public Long getProgramId() { return programId; }
    public Long getProgramApplyId() { return programApplyId; }
    public Long getUserId() { return userId; }
    public LocalDateTime getVotedAt() { return votedAt; }
    public VoteStatus getStatus() { return status; }
    public LocalDateTime getCancelledAt() { return cancelledAt; }
}
