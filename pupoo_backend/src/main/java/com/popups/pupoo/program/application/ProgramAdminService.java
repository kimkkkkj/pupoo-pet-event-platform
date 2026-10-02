// file: src/main/java/com/popups/pupoo/program/application/ProgramAdminService.java
package com.popups.pupoo.program.application;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.program.domain.enums.ProgramCategory;
import com.popups.pupoo.program.domain.model.Program;
import com.popups.pupoo.program.dto.ProgramCreateRequest;
import com.popups.pupoo.program.dto.ProgramResponse;
import com.popups.pupoo.program.dto.ProgramUpdateRequest;
import com.popups.pupoo.program.persistence.ProgramRepository;
import com.popups.pupoo.program.speaker.persistence.ProgramSpeakerMappingRepository;
import com.popups.pupoo.storage.support.StorageKeyNormalizer;
import com.popups.pupoo.storage.support.StorageUrlResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class ProgramAdminService {

    private final ProgramRepository programRepository;
    private final ProgramSpeakerMappingRepository programSpeakerMappingRepository;
    private final StorageKeyNormalizer storageKeyNormalizer;
    private final StorageUrlResolver storageUrlResolver;

    public ProgramResponse createProgram(ProgramCreateRequest request) {
        // DB는 시작·종료 일시가 필수이고 종료가 시작보다 뒤여야 한다. 저장 전에 알아보기 쉬운 문구로 막는다.
        if (request.startAt == null || request.endAt == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "시작일과 종료일을 모두 입력해 주세요.");
        }
        if (!request.endAt.isAfter(request.startAt)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "종료 일시는 시작 일시보다 뒤여야 해요.");
        }
        Program program = Program.builder()
                .eventId(request.eventId)
                .category(request.category)
                .programTitle(request.programTitle)
                .description(request.description == null ? "" : request.description)
                .startAt(request.startAt)
                .endAt(request.endAt)
                .boothId(request.boothId)
                .imageUrl(storageKeyNormalizer.normalizeToKey(request.imageUrl))
                .createdAt(LocalDateTime.now())
                .build();

        Program saved = programRepository.save(program);
        return toResponse(saved);
    }

    public ProgramResponse updateProgram(Long programId, ProgramUpdateRequest request) {
        Program program = programRepository.findById(programId)
                .orElseThrow(() -> new IllegalArgumentException("프로그램을 찾을 수 없습니다. id=" + programId));

        if (request.category != null) {
            program.updateCategory(request.category);
        }
        if (request.programTitle != null) {
            program.updateProgramTitle(request.programTitle);
        }
        if (request.description != null) {
            program.updateDescription(request.description);
        }
        if (request.startAt != null) {
            program.updateStartAt(request.startAt);
        }
        if (request.endAt != null) {
            program.updateEndAt(request.endAt);
        }
        if (request.boothId != null) {
            program.updateBoothId(request.boothId);
        }
        if (request.imageUrl != null) {
            program.updateImageUrl(storageKeyNormalizer.normalizeToKey(request.imageUrl));
        }
        if (program.getCategory() != ProgramCategory.SESSION) {
            programSpeakerMappingRepository.deleteByProgramId(programId);
        }

        return toResponse(program);
    }

    public ProgramResponse deleteProgram(Long programId) {
        Program program = programRepository.findById(programId)
                .orElseThrow(() -> new IllegalArgumentException("프로그램을 찾을 수 없습니다. id=" + programId));

        ProgramResponse response = toResponse(program);
        programSpeakerMappingRepository.deleteByProgramId(programId);
        programRepository.delete(program);
        return response;
    }

    private ProgramResponse toResponse(Program program) {
        return ProgramResponse.from(program, storageUrlResolver.toPublicUrl(program.getImageUrl()), 0L);
    }
}
