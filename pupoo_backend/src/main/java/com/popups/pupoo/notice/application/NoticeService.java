// file: src/main/java/com/popups/pupoo/notice/application/NoticeService.java
package com.popups.pupoo.notice.application;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.common.search.SearchType;
import com.popups.pupoo.notice.domain.enums.NoticeStatus;
import com.popups.pupoo.notice.domain.model.Notice;
import com.popups.pupoo.notice.dto.NoticeResponse;
import com.popups.pupoo.notice.persistence.NoticeRepository;
import com.popups.pupoo.event.persistence.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Sort.Order;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final EventRepository eventRepository;

    @Transactional
    public NoticeResponse get(Long noticeId) {
        noticeRepository.increaseViewCount(noticeId);

        // 공개 조회 정책: PUBLISHED만 조회 가능
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "공지사항이 존재하지 않습니다."));
        if (notice.getStatus() != NoticeStatus.PUBLISHED) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "공지사항이 존재하지 않습니다.");
        }
        return toResponse(notice);
    }

    /**
     * (관리자/공용) 검색 없이 목록 조회
     */
    public Page<NoticeResponse> list(int page, int size) {
        return list(SearchType.TITLE_CONTENT, "", page, size, null, null, null);
    }

    /**
     * 공지 목록 조회 (사용자 API).
     * 1. 정렬: is_pinned=1 상단 고정, is_pinned=0 이후 나열 (전체 공지 대상).
     * 2. 필터: scope/검색어는 is_pinned=0 인 것에만 적용.
     * 3. 정렬: 고정/비고정 각각 최신순(recent)|조회순(views)|오래된순(oldest).
     */
    public Page<NoticeResponse> list(SearchType searchType, String keyword, int page, int size, String scope, Boolean pinned, String sort) {
        validatePageRequest(page, size);
        String kw = (keyword == null) ? "" : keyword.trim();
        // scope null/빈 값/"all"(소문자, 모든공지 옵션) -> 비고정 필터 없음. "ALL"은 DB값(전체공지)이므로 유지.
        String scopeParam = (scope == null || scope.isBlank() || "all".equals(scope)) ? null : scope.trim();
        Sort order = buildNoticeListSort(sort);
        PageRequest pageable = PageRequest.of(page, size, order);
        Page<Notice> result = noticeRepository.findPublishedPinnedFirstFilterNonPinnedOnly(
                NoticeStatus.PUBLISHED,
                scopeParam,
                kw,
                pageable);
        return result.map(this::toResponse);
    }

    /** recent=최신순, views=조회순, oldest=오래된순. 고정(pinned) 내림차순 후 두 번째 기준 적용. */
    private static Sort buildNoticeListSort(String sort) {
        String key = (sort == null || sort.isBlank()) ? "recent" : sort.trim().toLowerCase();
        Order second = switch (key) {
            case "views" -> Order.desc("viewCount");
            case "oldest" -> Order.asc("createdAt");
            default -> Order.desc("createdAt"); // recent
        };
        return Sort.by(Order.desc("pinned"), second, Order.desc("noticeId"));
    }

    /**
     * 운영 환경에서 과도한 페이징 요청으로 DB 부하가 커지는 것을 방지하기 위해,
     * page/size 범위를 서비스 레이어에서 한번 더 제한한다.
     */
    private void validatePageRequest(int page, int size) {
        if (page < 0) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "page는 0 이상이어야 합니다.");
        }
        if (size < 1 || size > 100) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "size는 1~100 범위여야 합니다.");
        }
    }

    protected NoticeResponse toResponse(Notice n) {
        String eventName = n.getEventId() != null
                ? eventRepository.findById(n.getEventId()).map(e -> e.getEventName()).orElse(null)
                : null;
        return NoticeResponse.builder()
                .noticeId(n.getNoticeId())
                .scope(n.getScope())
                .eventId(n.getEventId())
                .eventName(eventName)
                .title(n.getNoticeTitle())
                .content(n.getContent())
                .pinned(n.isPinned())
                .status(n.getStatus())
                .createdAt(n.getCreatedAt())
                .updatedAt(n.getUpdatedAt())
                .viewCount(n.getViewCount())
                .build();
    }
}