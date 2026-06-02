// file: src/main/java/com/popups/pupoo/common/search/SearchType.java
package com.popups.pupoo.common.search;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;

/**
 * 검색 조건 표준화
 * - UI 요구: 제목 / 내용 / 제목+내용 / 작성자
 */
public enum SearchType {
    TITLE,
    CONTENT,
    TITLE_CONTENT,
    WRITER;

    public static SearchType from(String raw) {
        if (raw == null || raw.isBlank()) {
            return TITLE_CONTENT;
        }
        try {
            return SearchType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "INVALID_SEARCH_TYPE");
        }
    }
}
