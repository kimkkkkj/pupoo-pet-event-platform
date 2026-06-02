// file: src/main/java/com/popups/pupoo/inquiry/dto/InquiryResponse.java
package com.popups.pupoo.inquiry.dto;

import com.popups.pupoo.inquiry.domain.enums.InquiryCategory;
import com.popups.pupoo.inquiry.domain.enums.InquiryStatus;
import com.popups.pupoo.inquiry.domain.model.Inquiry;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class InquiryResponse {
    private Long inquiryId;
    private Long userId;
    private InquiryCategory category;
    private String inquiryTitle;
    private String content;
    private InquiryStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static InquiryResponse from(Inquiry inquiry) {
        InquiryResponse r = new InquiryResponse();
        r.inquiryId = inquiry.getInquiryId();
        r.userId = inquiry.getUserId();
        r.category = inquiry.getCategory();
        r.inquiryTitle = inquiry.getInquiryTitle();
        r.content = inquiry.getContent();
        r.status = inquiry.getStatus();
        r.createdAt = inquiry.getCreatedAt();
        r.updatedAt = inquiry.getUpdatedAt();
        return r;
    }
}
