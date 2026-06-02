// file: src/main/java/com/popups/pupoo/contest/vote/application/ContestVoteService.java
package com.popups.pupoo.contest.vote.application;

import java.time.LocalDateTime;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.popups.pupoo.contest.vote.domain.enums.VoteStatus;
import com.popups.pupoo.contest.vote.domain.model.ContestVote;
import com.popups.pupoo.contest.vote.dto.ContestVoteCreateResponse;
import com.popups.pupoo.contest.vote.dto.ContestVoteRequest;
import com.popups.pupoo.contest.vote.dto.ContestVoteResultResponse;
import com.popups.pupoo.contest.vote.persistence.ContestVoteRepository;
import com.popups.pupoo.program.apply.domain.enums.ApplyStatus;   //  추가
import com.popups.pupoo.program.apply.domain.model.ProgramApply;
import com.popups.pupoo.program.apply.persistence.ProgramApplyRepository;
import com.popups.pupoo.program.domain.enums.ProgramCategory;
import com.popups.pupoo.program.persistence.ProgramRepository;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;

@Service
public class ContestVoteService {

    private final ContestVoteRepository voteRepository;
    private final ProgramRepository programRepository;
    private final ProgramApplyRepository programApplyRepository;

    public ContestVoteService(
            ContestVoteRepository voteRepository,
            ProgramRepository programRepository,
            ProgramApplyRepository programApplyRepository
    ) {
        this.voteRepository = voteRepository;
        this.programRepository = programRepository;
        this.programApplyRepository = programApplyRepository;
    }

    @Transactional
    public ContestVoteCreateResponse vote(Long programId, Long userId, ContestVoteRequest req) {

        var program = programRepository.findById(programId)
                // 기능: 경연 프로그램 조회
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        if (program.getCategory() != ProgramCategory.CONTEST) {
            // 기능: 경연 프로그램 여부 검증
            throw new BusinessException(ErrorCode.CONTEST_NOT_CONTEST);
        }

        validateVotePeriod(program.getStartAt(), program.getEndAt());

        ProgramApply apply = programApplyRepository.findById(req.programApplyId())
                // 기능: 참가 신청 조회
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // 1️⃣ 해당 프로그램 소속 참가자인지
        if (!apply.getProgramId().equals(programId)) {
            // 기능: 프로그램-참가신청 매칭 검증
            throw new BusinessException(ErrorCode.CONTEST_APPLY_NOT_MATCHED);
        }

        // 2️⃣ APPROVED 상태만 투표 허용 (강력 추천)
        if (apply.getStatus() != ApplyStatus.APPROVED) {
            // 기능: 승인된 참가자만 투표 허용
            throw new BusinessException(ErrorCode.CONTEST_TARGET_INVALID);
        }

        // 3️⃣ 자기 자신에게 투표 금지 (어드민 직접 등록 시 userId=null → 본인 아님)
        if (apply.getUserId() != null && apply.getUserId().equals(userId)) {
            // 기능: 본인 투표 금지
            throw new BusinessException(ErrorCode.CONTEST_CANNOT_VOTE_SELF);
        }

        try {
            ContestVote saved =
                    voteRepository.save(new ContestVote(programId, req.programApplyId(), userId));

            return new ContestVoteCreateResponse(
                    saved.getVoteId(),
                    saved.getProgramId(),
                    saved.getProgramApplyId(),
                    saved.getVotedAt()
            );

        } catch (DataIntegrityViolationException e) {
            // UNIQUE(program_id, user_id, active_flag) 충돌
            throw new BusinessException(ErrorCode.CONTEST_VOTE_ALREADY);
        }
    }


    @Transactional
    public void cancel(Long programId, Long userId) {
        var program = programRepository.findById(programId)
                // 기능: 경연 프로그램 조회
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        if (program.getCategory() != ProgramCategory.CONTEST) {
            // 기능: 경연 프로그램 여부 검증
            throw new BusinessException(ErrorCode.CONTEST_NOT_CONTEST);
        }

        // 정책:
        // - 현재는 "투표 기간 내에서만 취소 가능"으로 유지
        // - 운영상 필요하면 이 체크를 제거하고 관리자만 취소 허용 등으로 확장
        validateVotePeriod(program.getStartAt(), program.getEndAt());

        int updated = voteRepository.cancelActiveVote(programId, userId);
        if (updated == 0) {
            // 기능: 취소할 투표 미존재
            throw new BusinessException(ErrorCode.CONTEST_VOTE_NOT_FOUND);
        }
    }

    @Transactional(readOnly = true)
    public ContestVoteResultResponse result(Long programId, Long userId) {
        var program = programRepository.findById(programId)
                // 기능: 경연 프로그램 조회
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        if (program.getCategory() != ProgramCategory.CONTEST) {
            // 기능: 경연 프로그램 여부 검증
            throw new BusinessException(ErrorCode.CONTEST_NOT_CONTEST);
        }

        long total = voteRepository.countActiveVotes(programId);

        var items = voteRepository.countActiveVotesByProgramApply(programId).stream()
                .map(v -> new ContestVoteResultResponse.Item(v.getProgramApplyId(), v.getVoteCount()))
                .toList();

        Long myProgramApplyId = null;
        if (userId != null) {
            myProgramApplyId = voteRepository
                    .findFirstByProgramIdAndUserIdAndStatus(programId, userId, VoteStatus.ACTIVE)
                    .map(ContestVote::getProgramApplyId)
                    .orElse(null);
        }

        return new ContestVoteResultResponse(programId, total, items, myProgramApplyId);
    }


    private void validateVotePeriod(LocalDateTime startAt, LocalDateTime endAt) {
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(startAt) || now.isAfter(endAt)) {
            // 기능: 투표 기간 검증
            throw new BusinessException(ErrorCode.CONTEST_VOTE_PERIOD_CLOSED);
        }
    }
}
