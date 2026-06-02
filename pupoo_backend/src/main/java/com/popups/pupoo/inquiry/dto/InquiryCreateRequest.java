// file: src/main/java/com/popups/pupoo/inquiry/dto/InquiryCreateRequest.java
package com.popups.pupoo.inquiry.dto;

import com.popups.pupoo.inquiry.domain.enums.InquiryCategory;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class InquiryCreateRequest {
    private InquiryCategory category;
    private String inquiryTitle;
    private String content;
}
