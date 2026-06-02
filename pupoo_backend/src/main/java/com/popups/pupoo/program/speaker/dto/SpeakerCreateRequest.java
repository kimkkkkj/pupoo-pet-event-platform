// file: src/main/java/com/popups/pupoo/program/speaker/dto/SpeakerCreateRequest.java
package com.popups.pupoo.program.speaker.dto;

/**
 * 연사 생성 요청 DTO (관리자용)
 *
 * DB(v1.0) 기준
 * - speakers는 독립 리소스이다.
 * - programId는 "프로그램 하위에서 연사 생성" UX를 지원하기 위한 선택값이다.
 */
public class SpeakerCreateRequest {

    public Long programId;

    public String speakerName;
    public String speakerBio;
    public String speakerEmail;
    public String speakerPhone;
    public String speakerImageUrl;
}
