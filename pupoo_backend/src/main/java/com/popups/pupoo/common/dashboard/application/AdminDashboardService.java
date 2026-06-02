package com.popups.pupoo.common.dashboard.application;

import com.popups.pupoo.booth.domain.enums.BoothStatus;
import com.popups.pupoo.booth.domain.enums.BoothType;
import com.popups.pupoo.booth.domain.enums.BoothZone;
import com.popups.pupoo.booth.domain.model.Booth;
import com.popups.pupoo.booth.dto.BoothCreateRequest;
import com.popups.pupoo.booth.dto.BoothResponse;
import com.popups.pupoo.booth.dto.BoothUpdateRequest;
import com.popups.pupoo.booth.persistence.BoothRepository;
import com.popups.pupoo.common.dashboard.dto.DashboardEventResponse;
import com.popups.pupoo.common.dashboard.dto.DashboardPastEventResponse;
import com.popups.pupoo.common.dashboard.dto.DashboardProgramResponse;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.event.domain.enums.EventStatus;
import com.popups.pupoo.event.domain.enums.RegistrationStatus;
import com.popups.pupoo.event.domain.model.Event;
import com.popups.pupoo.event.persistence.EventRegistrationRepository;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.program.domain.enums.ProgramCategory;
import com.popups.pupoo.program.domain.model.Program;
import com.popups.pupoo.program.persistence.ProgramRepository;
import com.popups.pupoo.storage.support.StorageUrlResolver;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDashboardService {

    private final EventRepository eventRepository;
    private final EventRegistrationRepository registrationRepository;
    private final ProgramRepository programRepository;
    private final BoothRepository boothRepository;
    private final EntityManager em;
    private final StorageUrlResolver storageUrlResolver;

    public List<DashboardEventResponse> listEvents() {
        List<Event> events = eventRepository.findAll(Sort.by(Sort.Direction.DESC, "startAt"));
        return events.stream()
                .map(event -> {
                    long count = registrationRepository.countByEventIdAndStatus(
                            event.getEventId(),
                            RegistrationStatus.APPROVED
                    );
                    return DashboardEventResponse.from(
                            event,
                            count,
                            storageUrlResolver.toPublicUrl(event.getImageUrl())
                    );
                })
                .collect(Collectors.toList());
    }

    public List<DashboardProgramResponse> listPrograms() {
        List<Program> programs = programRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        return programs.stream()
                .map(program -> DashboardProgramResponse.from(
                        program,
                        countProgramEnrolled(program.getProgramId()),
                        storageUrlResolver.toPublicUrl(program.getImageUrl())
                ))
                .collect(Collectors.toList());
    }

    public List<DashboardProgramResponse> listProgramsByEvent(Long eventId) {
        List<Program> programs = programRepository
                .findByEventId(eventId, PageRequest.of(0, 500, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent();
        return programs.stream()
                .map(program -> DashboardProgramResponse.from(
                        program,
                        countProgramEnrolled(program.getProgramId()),
                        storageUrlResolver.toPublicUrl(program.getImageUrl())
                ))
                .collect(Collectors.toList());
    }

    public List<DashboardProgramResponse> listProgramsByEventAndCategory(Long eventId, ProgramCategory category) {
        List<Program> programs = programRepository
                .findByEventIdAndCategory(
                        eventId,
                        category,
                        PageRequest.of(0, 500, Sort.by(Sort.Direction.DESC, "createdAt"))
                )
                .getContent();
        return programs.stream()
                .map(program -> DashboardProgramResponse.from(
                        program,
                        countProgramEnrolled(program.getProgramId()),
                        storageUrlResolver.toPublicUrl(program.getImageUrl())
                ))
                .collect(Collectors.toList());
    }

    public List<BoothResponse> listBoothsByEvent(Long eventId) {
        return boothRepository.findEventBooths(
                        eventId,
                        null,
                        null,
                        PageRequest.of(0, 500, Sort.by(Sort.Direction.ASC, "boothId"))
                )
                .map(BoothResponse::from)
                .getContent();
    }

    @Transactional
    public BoothResponse createBooth(BoothCreateRequest request) {
        Booth booth = Booth.create(
                request.getEventId(),
                request.getPlaceName(),
                request.getType() != null ? BoothType.valueOf(request.getType()) : BoothType.BOOTH_EXPERIENCE,
                request.getDescription(),
                request.getCompany(),
                request.getZone() != null ? BoothZone.valueOf(request.getZone()) : BoothZone.ZONE_A,
                request.getStatus() != null ? BoothStatus.valueOf(request.getStatus()) : BoothStatus.OPEN
        );
        return BoothResponse.from(boothRepository.save(booth));
    }

    @Transactional
    public BoothResponse updateBooth(Long boothId, BoothUpdateRequest request) {
        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOTH_NOT_FOUND));
        booth.update(
                request.getPlaceName(),
                request.getType() != null ? BoothType.valueOf(request.getType()) : null,
                request.getDescription(),
                request.getCompany(),
                request.getZone() != null ? BoothZone.valueOf(request.getZone()) : null,
                request.getStatus() != null ? BoothStatus.valueOf(request.getStatus()) : null
        );
        return BoothResponse.from(booth);
    }

    @Transactional
    public void deleteBooth(Long boothId) {
        if (!boothRepository.existsById(boothId)) {
            throw new BusinessException(ErrorCode.BOOTH_NOT_FOUND);
        }
        boothRepository.deleteById(boothId);
    }

    public List<DashboardPastEventResponse> listPastEvents() {
        List<Event> ended = eventRepository
                .search(
                        null,
                        EventStatus.ENDED,
                        null,
                        null,
                        PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "startAt"))
                )
                .getContent();

        return ended.stream()
                .map(event -> {
                    long count = registrationRepository.countByEventIdAndStatus(
                            event.getEventId(),
                            RegistrationStatus.APPROVED
                    );
                    int capacity = 500;
                    int zoneUsage = count > 0 ? Math.min((int) (count * 100 / capacity), 100) : 0;
                    int eventRate = zoneUsage > 0 ? Math.max(zoneUsage - 8, 0) : 0;
                    int congestion = zoneUsage > 0 ? Math.max(zoneUsage - 15, 0) : 0;
                    return DashboardPastEventResponse.from(
                            event,
                            count,
                            capacity,
                            zoneUsage,
                            eventRate,
                            congestion,
                            storageUrlResolver.toPublicUrl(event.getImageUrl())
                    );
                })
                .collect(Collectors.toList());
    }

    private long countProgramEnrolled(Long programId) {
        try {
            TypedQuery<Long> query = em.createQuery(
                    "SELECT COUNT(pa) FROM ProgramApply pa " +
                            "WHERE pa.programId = :pid AND pa.status IN :statuses",
                    Long.class
            );
            query.setParameter("pid", programId);
            query.setParameter("statuses", List.of(
                    com.popups.pupoo.program.apply.domain.enums.ApplyStatus.APPLIED,
                    com.popups.pupoo.program.apply.domain.enums.ApplyStatus.WAITING,
                    com.popups.pupoo.program.apply.domain.enums.ApplyStatus.APPROVED,
                    com.popups.pupoo.program.apply.domain.enums.ApplyStatus.CHECKED_IN
            ));
            return query.getSingleResult();
        } catch (Exception e) {
            return 0L;
        }
    }
}
