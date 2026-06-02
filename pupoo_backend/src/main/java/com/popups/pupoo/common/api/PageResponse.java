// file: src/main/java/com/popups/pupoo/common/api/PageResponse.java
package com.popups.pupoo.common.api;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * PageResponse
 *
 * Spring Data의 Page를 그대로 반환하지 않고,
 * 프론트엔드에 필요한 페이징 정보만 추려서 내려주기 위한 DTO
 *
 * ✔ 제네릭 지원
 * ✔ Page.from(...) 정적 팩토리 제공
 */
public class PageResponse<T> {

    /** 실제 데이터 목록 */
    private List<T> content;

    /** 현재 페이지 번호 (0-base 그대로 유지) */
    private int page;

    /** 페이지 크기 */
    private int size;

    /** 전체 데이터 개수 */
    private long totalElements;

    /** 전체 페이지 수 */
    private int totalPages;

    /** 마지막 페이지 여부 */
    private boolean last;

    public PageResponse() {}

    private PageResponse(List<T> content,
                         int page,
                         int size,
                         long totalElements,
                         int totalPages,
                         boolean last) {
        this.content = content;
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.last = last;
    }

    /**
     * Page → PageResponse 변환
     */
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast()
        );
    }

    // ===== Getter =====

    public List<T> getContent() {
        return content;
    }

    public int getPage() {
        return page;
    }

    public int getSize() {
        return size;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public boolean isLast() {
        return last;
    }
}
