// file: src/main/java/com/popups/pupoo/program/speaker/application/SpeakerService.java
package com.popups.pupoo.program.speaker.application;

import com.popups.pupoo.program.domain.enums.ProgramCategory;
import com.popups.pupoo.program.domain.model.Program;
import com.popups.pupoo.program.persistence.ProgramRepository;
import com.popups.pupoo.program.speaker.domain.model.ProgramSpeakerMapping;
import com.popups.pupoo.program.speaker.domain.model.Speaker;
import com.popups.pupoo.program.speaker.dto.SpeakerResponse;
import com.popups.pupoo.program.speaker.persistence.ProgramSpeakerMappingRepository;
import com.popups.pupoo.program.speaker.persistence.SpeakerRepository;
import com.popups.pupoo.storage.support.StorageUrlResolver;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SpeakerService {

    private final SpeakerRepository speakerRepository;
    private final ProgramRepository programRepository;
    private final ProgramSpeakerMappingRepository programSpeakerMappingRepository;
    private final StorageUrlResolver storageUrlResolver;

    public List<SpeakerResponse> getSpeakers() {
        return speakerRepository.findAllByOrderBySpeakerIdDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public SpeakerResponse getSpeaker(Long speakerId) {
        Speaker speaker = speakerRepository.findById(speakerId)
                .orElseThrow(() -> new EntityNotFoundException("SPEAKER_NOT_FOUND"));
        return toResponse(speaker);
    }

    public List<SpeakerResponse> getSpeakersByProgram(Long programId) {
        Program program = getProgram(programId);
        if (!supportsSpeaker(program)) {
            return List.of();
        }

        Long speakerId = programSpeakerMappingRepository.findByProgramId(programId)
                .stream()
                .map(ProgramSpeakerMapping::getSpeakerId)
                .sorted()
                .findFirst()
                .orElse(null);

        if (speakerId == null) {
            return List.of();
        }

        Speaker speaker = speakerRepository.findById(speakerId)
                .orElseThrow(() -> new EntityNotFoundException("SPEAKER_NOT_FOUND"));

        return List.of(toResponse(speaker));
    }

    public SpeakerResponse getSpeakerByProgram(Long programId, Long speakerId) {
        Program program = getProgram(programId);
        if (!supportsSpeaker(program)) {
            throw new EntityNotFoundException("PROGRAM_SPEAKER_NOT_FOUND");
        }

        if (!programSpeakerMappingRepository.existsByProgramIdAndSpeakerId(programId, speakerId)) {
            throw new EntityNotFoundException("PROGRAM_SPEAKER_NOT_FOUND");
        }

        Speaker speaker = speakerRepository.findById(speakerId)
                .orElseThrow(() -> new EntityNotFoundException("SPEAKER_NOT_FOUND"));

        return toResponse(speaker);
    }

    private Program getProgram(Long programId) {
        return programRepository.findById(programId)
                .orElseThrow(() -> new EntityNotFoundException("PROGRAM_NOT_FOUND"));
    }

    private boolean supportsSpeaker(Program program) {
        return program.getCategory() == ProgramCategory.SESSION;
    }

    private SpeakerResponse toResponse(Speaker speaker) {
        return SpeakerResponse.from(speaker, storageUrlResolver.toPublicUrl(speaker.getSpeakerImageUrl()));
    }
}
