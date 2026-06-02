// file: src/main/java/com/popups/pupoo/program/speaker/application/SpeakerAdminService.java
package com.popups.pupoo.program.speaker.application;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.program.domain.enums.ProgramCategory;
import com.popups.pupoo.program.domain.model.Program;
import com.popups.pupoo.program.persistence.ProgramRepository;
import com.popups.pupoo.program.speaker.domain.model.ProgramSpeakerMapping;
import com.popups.pupoo.program.speaker.domain.model.Speaker;
import com.popups.pupoo.program.speaker.dto.SpeakerCreateRequest;
import com.popups.pupoo.program.speaker.dto.SpeakerResponse;
import com.popups.pupoo.program.speaker.dto.SpeakerUpdateRequest;
import com.popups.pupoo.program.speaker.persistence.ProgramSpeakerMappingRepository;
import com.popups.pupoo.program.speaker.persistence.SpeakerRepository;
import com.popups.pupoo.storage.support.StorageKeyNormalizer;
import com.popups.pupoo.storage.support.StorageUrlResolver;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class SpeakerAdminService {

    private final SpeakerRepository speakerRepository;
    private final ProgramRepository programRepository;
    private final ProgramSpeakerMappingRepository programSpeakerMappingRepository;
    private final StorageKeyNormalizer storageKeyNormalizer;
    private final StorageUrlResolver storageUrlResolver;

    public SpeakerResponse createSpeaker(SpeakerCreateRequest request) {
        Speaker speaker = Speaker.builder()
                .speakerName(request.speakerName)
                .speakerBio(request.speakerBio)
                .speakerEmail(request.speakerEmail)
                .speakerPhone(request.speakerPhone)
                .speakerImageUrl(storageKeyNormalizer.normalizeToKey(request.speakerImageUrl))
                .build();

        Speaker saved = speakerRepository.save(speaker);

        if (request.programId != null) {
            Program targetProgram = programRepository.findById(request.programId)
                    .orElseThrow(() -> new EntityNotFoundException("PROGRAM_NOT_FOUND"));
            assignSpeakerToProgram(saved.getSpeakerId(), targetProgram);
        }

        return toResponse(saved);
    }

    public SpeakerResponse updateSpeaker(Long speakerId, SpeakerUpdateRequest request) {
        Speaker speaker = speakerRepository.findById(speakerId)
                .orElseThrow(() -> new EntityNotFoundException("SPEAKER_NOT_FOUND"));

        speaker.update(
                request.speakerName,
                request.speakerBio,
                request.speakerEmail,
                request.speakerPhone,
                storageKeyNormalizer.normalizeToKey(request.speakerImageUrl)
        );

        if (request.programId != null) {
            Program targetProgram = programRepository.findById(request.programId)
                    .orElseThrow(() -> new EntityNotFoundException("PROGRAM_NOT_FOUND"));
            assignSpeakerToProgram(speakerId, targetProgram);
        }

        return toResponse(speaker);
    }

    public void deleteSpeaker(Long speakerId) {
        Speaker speaker = speakerRepository.findById(speakerId)
                .orElseThrow(() -> new EntityNotFoundException("SPEAKER_NOT_FOUND"));

        speaker.softDelete(LocalDateTime.now());
        programSpeakerMappingRepository.deleteBySpeakerId(speakerId);
    }

    private void validateSessionSpeakerSchedule(Long speakerId, Program targetProgram) {
        if (targetProgram.getCategory() != ProgramCategory.SESSION) {
            return;
        }

        long conflictCount = programSpeakerMappingRepository.countSessionScheduleConflicts(
                speakerId,
                targetProgram.getProgramId(),
                targetProgram.getStartAt(),
                targetProgram.getEndAt()
        );

        if (conflictCount > 0) {
            throw new BusinessException(
                    ErrorCode.INVALID_REQUEST,
                    "SPEAKER_SCHEDULE_CONFLICT: overlapping session time"
            );
        }
    }

    private void assignSpeakerToProgram(Long speakerId, Program targetProgram) {
        if (targetProgram.getCategory() != ProgramCategory.SESSION) {
            programSpeakerMappingRepository.deleteByProgramId(targetProgram.getProgramId());
            return;
        }

        validateSessionSpeakerSchedule(speakerId, targetProgram);

        programSpeakerMappingRepository.deleteByProgramIdAndSpeakerIdNot(
                targetProgram.getProgramId(),
                speakerId
        );

        if (!programSpeakerMappingRepository.existsByProgramIdAndSpeakerId(
                targetProgram.getProgramId(),
                speakerId
        )) {
            programSpeakerMappingRepository.save(
                    ProgramSpeakerMapping.of(targetProgram.getProgramId(), speakerId)
            );
        }
    }

    private SpeakerResponse toResponse(Speaker speaker) {
        return SpeakerResponse.from(speaker, storageUrlResolver.toPublicUrl(speaker.getSpeakerImageUrl()));
    }
}
