// file: src/main/java/com/popups/pupoo/program/dto/ProgramCreateRequest.java
package com.popups.pupoo.program.dto;

import com.popups.pupoo.program.domain.enums.ProgramCategory;

import java.time.LocalDateTime;

/**
 * 프로그램 생성 요청 DTO (관리자용)
 */
public class ProgramCreateRequest {

    public Long eventId;
    public ProgramCategory category;
    public String programTitle;
    public String description;
    public LocalDateTime startAt;
    public LocalDateTime endAt;

    /**
     * 프로그램이 특정 부스/공간에 속할 경우 매핑.
     */
    public Long boothId;

    /** 프로그램 이미지 URL */
    public String imageUrl;
}
