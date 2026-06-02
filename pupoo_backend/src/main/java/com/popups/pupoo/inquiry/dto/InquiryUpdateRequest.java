// file: src/main/java/com/popups/pupoo/inquiry/dto/InquiryUpdateRequest.java
package com.popups.pupoo.inquiry.dto;

import com.popups.pupoo.inquiry.domain.enums.InquiryCategory;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 문의 수정(사용자) - 운영안정 v2
 * - OPEN 상태에서만 수정 허용(서비스 레벨에서 검증)
 */
@Getter
@Setter
@NoArgsConstructor
public class InquiryUpdateRequest {
    private InquiryCategory category;
    private String inquiryTitle;
    private String content;
}
