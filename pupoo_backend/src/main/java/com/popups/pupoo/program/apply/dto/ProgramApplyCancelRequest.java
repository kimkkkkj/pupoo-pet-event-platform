// file: src/main/java/com/popups/pupoo/program/apply/dto/ProgramApplyCancelRequest.java
package com.popups.pupoo.program.apply.dto;

/**
 * 프로그램 신청 취소 요청 DTO.
 *
 * 현재 API는 /{id}/cancel 로 body 없이 처리하지만,
 * 추후 취소 사유 수집이 필요해질 수 있어 DTO를 유지한다.
 */
public class ProgramApplyCancelRequest {
    public String reason;
}
