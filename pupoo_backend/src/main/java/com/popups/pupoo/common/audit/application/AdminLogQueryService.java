package com.popups.pupoo.common.audit.application;

import com.popups.pupoo.common.api.PageResponse;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.common.audit.domain.model.AdminLog;
import com.popups.pupoo.common.audit.dto.AdminLogListResponse;
import com.popups.pupoo.common.audit.persistence.AdminLogRepository;
import com.popups.pupoo.user.domain.model.User;
import com.popups.pupoo.user.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 관리자 감사 로그 조회 전용 서비스다.
 * 관리자 계정 정보를 함께 조합해 화면용 응답으로 변환하고, 페이지 크기는 서비스 단에서 제한한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminLogQueryService {

    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 100;

    private final AdminLogRepository adminLogRepository;
    private final UserRepository userRepository;

    /**
     * 감사 로그를 조건 검색 후 페이지 응답으로 변환한다.
     */
    public PageResponse<AdminLogListResponse> list(String keyword, AdminTargetType targetType, int page, int size) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                normalizeSize(size),
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("logId"))
        );

        Page<AdminLog> logPage = adminLogRepository.search(normalizeKeyword(keyword), targetType, pageable);
        Map<Long, User> adminUserMap = userRepository.findAllById(
                        logPage.getContent().stream()
                                .map(AdminLog::getAdminId)
                                .filter(id -> id != null)
                                .distinct()
                                .collect(Collectors.toList())
                ).stream()
                .collect(Collectors.toMap(User::getUserId, Function.identity()));

        Page<AdminLogListResponse> responsePage = logPage.map(
                log -> AdminLogListResponse.from(log, adminUserMap.get(log.getAdminId()))
        );
        return PageResponse.from(responsePage);
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }

        String trimmed = keyword.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * 과도한 조회를 막기 위해 페이지 크기를 100 이하로 제한한다.
     */
    private int normalizeSize(int size) {
        if (size <= 0) {
            return DEFAULT_SIZE;
        }
        return Math.min(size, MAX_SIZE);
    }
}
