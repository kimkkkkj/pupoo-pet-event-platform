// file: src/main/java/com/popups/pupoo/program/speaker/persistence/ProgramSpeakerMappingRepository.java
package com.popups.pupoo.program.speaker.persistence;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.popups.pupoo.program.speaker.domain.model.ProgramSpeakerMapping;

public interface ProgramSpeakerMappingRepository extends JpaRepository<ProgramSpeakerMapping, ProgramSpeakerMapping.Pk> {

    List<ProgramSpeakerMapping> findByProgramId(Long programId);

    List<ProgramSpeakerMapping> findBySpeakerId(Long speakerId);

    boolean existsByProgramIdAndSpeakerId(Long programId, Long speakerId);

    @Query(value = """
            SELECT EXISTS (
                SELECT 1
                FROM program_speakers ps
                JOIN event_program ep ON ep.program_id = ps.program_id
                WHERE ps.speaker_id = :speakerId
                  AND ps.program_id <> :programId
                  AND ep.category = 'SESSION'
                  AND ep.start_at < :targetEnd
                  AND ep.end_at > :targetStart
            )
            """, nativeQuery = true)
    long countSessionScheduleConflicts(
            @Param("speakerId") Long speakerId,
            @Param("programId") Long programId,
            @Param("targetStart") LocalDateTime targetStart,
            @Param("targetEnd") LocalDateTime targetEnd
    );

    void deleteByProgramId(Long programId);

    void deleteByProgramIdAndSpeakerIdNot(Long programId, Long speakerId);

    void deleteByProgramIdAndSpeakerId(Long programId, Long speakerId);

    void deleteBySpeakerId(Long speakerId);
}
