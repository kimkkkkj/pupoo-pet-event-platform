// file: src/main/java/com/popups/pupoo/program/speaker/dto/SpeakerResponse.java
package com.popups.pupoo.program.speaker.dto;

import com.popups.pupoo.program.speaker.domain.model.Speaker;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SpeakerResponse {

    private Long speakerId;
    private String speakerName;
    private String speakerBio;
    private String speakerEmail;
    private String speakerPhone;
    private String speakerImageUrl;

    public static SpeakerResponse from(Speaker speaker, String speakerImageUrl) {
        return SpeakerResponse.builder()
                .speakerId(speaker.getSpeakerId())
                .speakerName(speaker.getSpeakerName())
                .speakerBio(speaker.getSpeakerBio())
                .speakerEmail(speaker.getSpeakerEmail())
                .speakerPhone(speaker.getSpeakerPhone())
                .speakerImageUrl(speakerImageUrl)
                .build();
    }
}
