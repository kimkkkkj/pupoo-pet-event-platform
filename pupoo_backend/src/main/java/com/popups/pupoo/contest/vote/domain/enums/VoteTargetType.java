// file: src/main/java/com/popups/pupoo/contest/vote/domain/enums/VoteTargetType.java
package com.popups.pupoo.contest.vote.domain.enums;

/**
 * 투표 대상 타입.
 *
 * 현재 스키마/코드 기준
 * - contest_votes는 program_apply_id(콘테스트 참가 신청) 기준으로 투표한다.
 */
public enum VoteTargetType {
    PROGRAM_APPLY
}
