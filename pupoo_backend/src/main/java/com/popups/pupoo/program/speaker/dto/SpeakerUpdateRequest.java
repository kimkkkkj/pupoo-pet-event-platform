// file: src/main/java/com/popups/pupoo/program/speaker/dto/SpeakerUpdateRequest.java
package com.popups.pupoo.program.speaker.dto;

/**
 * 연사 수정 요청 DTO (관리자용)
 *
 * DB(v1.0) 기준
 * - speakers는 독립 리소스이다.
 * - programId는 "특정 프로그램에 연사 연결"을 위해 선택값으로 유지한다.
 */
public class SpeakerUpdateRequest {

    public Long programId;

    public String speakerName;
    public String speakerBio;
    public String speakerEmail;
    public String speakerPhone;
    public String speakerImageUrl;
}
