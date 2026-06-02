// file: src/main/java/com/popups/pupoo/program/application/ProgramService.java
package com.popups.pupoo.program.application;

import com.popups.pupoo.common.api.PageResponse;
import com.popups.pupoo.program.apply.domain.enums.ApplyStatus;
import com.popups.pupoo.program.apply.persistence.ProgramApplyRepository;
import com.popups.pupoo.program.domain.enums.ProgramCategory;
import com.popups.pupoo.program.domain.model.Program;
import com.popups.pupoo.program.dto.ExperienceWaitResponse;
import com.popups.pupoo.program.dto.ProgramResponse;
import com.popups.pupoo.program.persistence.ExperienceWaitRepository;
import com.popups.pupoo.program.persistence.ProgramRepository;
import com.popups.pupoo.storage.support.StorageUrlResolver;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProgramService {
    private static final EnumSet<ApplyStatus> ACTIVE_APPLY_STATUSES =
            EnumSet.of(ApplyStatus.APPLIED, ApplyStatus.WAITING, ApplyStatus.APPROVED);

    private final ProgramRepository programRepository;
    private final ProgramApplyRepository programApplyRepository;
    private final ExperienceWaitRepository experienceWaitRepository;
    private final StorageUrlResolver storageUrlResolver;

    public PageResponse<ProgramResponse> getPrograms(Long eventId, ProgramCategory category, Pageable pageable) {
        Page<Program> page = (category == null)
                ? programRepository.findByEventId(eventId, pageable)
                : programRepository.findByEventIdAndCategory(eventId, category, pageable);

        Map<Long, Long> participantCountByProgramId = resolveParticipantCounts(page.getContent());
        return PageResponse.from(page.map(program -> toResponse(
                program,
                participantCountByProgramId.getOrDefault(program.getProgramId(), 0L)
        )));
    }

    public ProgramResponse getProgramDetail(Long programId) {
        Program program = programRepository.findById(programId)
                .orElseThrow(() -> new EntityNotFoundException("PROGRAM_NOT_FOUND"));
        long participantCount = programApplyRepository.countByProgramIdAndStatusIn(programId, ACTIVE_APPLY_STATUSES);
        ProgramResponse base = toResponse(program, participantCount);

        ExperienceWaitResponse wait = program.getCategory() == ProgramCategory.EXPERIENCE
                ? experienceWaitRepository.findByProgramId(programId)
                .map(ExperienceWaitResponse::from)
                .orElse(null)
                : null;

        return ProgramResponse.builder()
                .programId(base.getProgramId())
                .eventId(base.getEventId())
                .category(base.getCategory())
                .programTitle(base.getProgramTitle())
                .description(base.getDescription())
                .imageUrl(base.getImageUrl())
                .boothId(base.getBoothId())
                .startAt(base.getStartAt())
                .endAt(base.getEndAt())
                .ongoing(base.isOngoing())
                .upcoming(base.isUpcoming())
                .ended(base.isEnded())
                .participantCount(base.getParticipantCount())
                .experienceWait(wait)
                .build();
    }

    private ProgramResponse toResponse(Program program, long participantCount) {
        return ProgramResponse.from(
                program,
                storageUrlResolver.toPublicUrl(program.getImageUrl()),
                participantCount
        );
    }

    private Map<Long, Long> resolveParticipantCounts(List<Program> programs) {
        if (programs == null || programs.isEmpty()) {
            return Map.of();
        }

        List<Long> programIds = programs.stream()
                .map(Program::getProgramId)
                .filter(id -> id != null)
                .distinct()
                .toList();

        if (programIds.isEmpty()) {
            return Map.of();
        }

        return programApplyRepository
                .countByProgramIdInAndStatusInGrouped(programIds, ACTIVE_APPLY_STATUSES)
                .stream()
                .collect(Collectors.toMap(
                        ProgramApplyRepository.ProgramApplyCountProjection::getProgramId,
                        ProgramApplyRepository.ProgramApplyCountProjection::getApplyCount,
                        Long::sum
                ));
    }
}
