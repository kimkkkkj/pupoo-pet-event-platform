package com.popups.pupoo.notice.application;

import com.popups.pupoo.common.audit.application.AdminLogService;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.notice.domain.enums.NoticeStatus;
import com.popups.pupoo.notice.domain.model.Notice;
import com.popups.pupoo.notice.dto.NoticeCreateRequest;
import com.popups.pupoo.notice.dto.NoticeResponse;
import com.popups.pupoo.notice.dto.NoticeUpdateRequest;
import com.popups.pupoo.notice.persistence.NoticeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoticeAdminService {

    private final NoticeRepository noticeRepository;
    private final EventRepository eventRepository;
    private final AdminLogService adminLogService;

    public Page<NoticeResponse> list(int page,
                                     int size,
                                     NoticeStatus status,
                                     String keyword,
                                     String scope,
                                     Boolean pinned) {
        validatePageRequest(page, size);
        PageRequest pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Order.desc("pinned"), Sort.Order.desc("createdAt"), Sort.Order.desc("noticeId"))
        );
        return noticeRepository.searchAdmin(
                status,
                normalizeKeyword(keyword),
                normalizeScope(scope),
                pinned,
                pageable
        ).map(this::toResponse);
    }

    public NoticeResponse get(Long noticeId) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "공지사항이 존재하지 않습니다."));
        return toResponse(notice);
    }

    /**
     * 공지사항 생성 관리자 서비스다.
     */
    @Transactional
    public NoticeResponse create(Long adminUserId, NoticeCreateRequest request) {
        Notice notice = Notice.builder()
                .scope(request.getScope())
                .eventId(request.getEventId())
                .noticeTitle(request.getTitle())
                .content(request.getContent())
                .fileAttached("N")
                .pinned(Boolean.TRUE.equals(request.getPinned()))
                .status(request.getStatus())
                .createdByAdminId(adminUserId)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .viewCount(0)
                .build();

        Notice saved = noticeRepository.save(notice);
        adminLogService.write("NOTICE_CREATE", AdminTargetType.NOTICE, saved.getNoticeId());
        return toResponse(saved);
    }

    /**
     * 공지사항 수정 관리자 서비스다.
     */
    @Transactional
    public NoticeResponse update(Long noticeId, NoticeUpdateRequest request) {
        logIgnoredUpdateFields(noticeId, request);

        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "공지사항이 존재하지 않습니다."));

        Notice updated = notice.toBuilder()
                .noticeTitle(request.getTitle())
                .content(request.getContent())
                .pinned(Boolean.TRUE.equals(request.getPinned()))
                .status(request.getStatus())
                .updatedAt(LocalDateTime.now())
                .build();

        Notice saved = noticeRepository.save(updated);
        adminLogService.write("NOTICE_UPDATE", AdminTargetType.NOTICE, noticeId);
        return toResponse(saved);
    }

    /**
     * 공지사항 삭제 관리자 서비스다.
     * 운영 안정성을 위해 물리 삭제 대신 상태를 HIDDEN으로 변경한다.
     */
    @Transactional
    public void delete(Long noticeId) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "공지사항이 존재하지 않습니다."));

        Notice updated = notice.toBuilder()
                .status(NoticeStatus.HIDDEN)
                .pinned(false)
                .updatedAt(LocalDateTime.now())
                .build();

        noticeRepository.save(updated);
        adminLogService.write("NOTICE_DELETE_SOFT", AdminTargetType.NOTICE, noticeId);
    }

    private NoticeResponse toResponse(Notice notice) {
        String eventName = notice.getEventId() != null
                ? eventRepository.findById(notice.getEventId()).map(event -> event.getEventName()).orElse(null)
                : null;
        return NoticeResponse.builder()
                .noticeId(notice.getNoticeId())
                .scope(notice.getScope())
                .eventId(notice.getEventId())
                .eventName(eventName)
                .title(notice.getNoticeTitle())
                .content(notice.getContent())
                .pinned(notice.isPinned())
                .status(notice.getStatus())
                .createdAt(notice.getCreatedAt())
                .updatedAt(notice.getUpdatedAt())
                .viewCount(notice.getViewCount())
                .build();
    }

    private void validatePageRequest(int page, int size) {
        if (page < 0) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "page must be greater than or equal to 0");
        }
        if (size < 1 || size > 100) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "size must be between 1 and 100");
        }
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }
        String normalized = keyword.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeScope(String scope) {
        if (scope == null) {
            return null;
        }
        String normalized = scope.trim();
        if (normalized.isEmpty() || "all".equalsIgnoreCase(normalized)) {
            return null;
        }
        return normalized;
    }

    private void logIgnoredUpdateFields(Long noticeId, NoticeUpdateRequest request) {
        if (request.getScope() != null) {
            log.warn("Notice update ignored unsupported field: noticeId={} field=scope value={}", noticeId, request.getScope());
        }
        if (request.getEventId() != null) {
            log.warn("Notice update ignored unsupported field: noticeId={} field=eventId value={}", noticeId, request.getEventId());
        }
    }
}
