// 수정파일.java
// file: src/main/java/com/popups/pupoo/program/speaker/domain/model/ProgramSpeakerMapping.java
package com.popups.pupoo.program.speaker.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.util.Objects;

/**
 * program_speakers 매핑 엔티티
 *
 * DB 기준
 * - program_speakers(program_id, speaker_id) PK
 */
@Entity
@Table(name = "program_speakers")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@IdClass(ProgramSpeakerMapping.Pk.class)
public class ProgramSpeakerMapping {

    @Id
    @Column(name = "program_id")
    private Long programId;

    @Id
    @Column(name = "speaker_id")
    private Long speakerId;

    public static ProgramSpeakerMapping of(Long programId, Long speakerId) {
        return new ProgramSpeakerMapping(programId, speakerId);
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Pk implements Serializable {
        private Long programId;
        private Long speakerId;

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            Pk pk = (Pk) o;
            return Objects.equals(programId, pk.programId) &&
                   Objects.equals(speakerId, pk.speakerId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(programId, speakerId);
        }
    }
}