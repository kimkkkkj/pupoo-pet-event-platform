// file: src/main/java/com/popups/pupoo/inquiry/application/InquiryService.java
package com.popups.pupoo.inquiry.application;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.inquiry.domain.enums.InquiryStatus;
import com.popups.pupoo.inquiry.domain.model.Inquiry;
import com.popups.pupoo.inquiry.dto.*;
import com.popups.pupoo.inquiry.persistence.InquiryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InquiryService {

    private final InquiryRepository inquiryRepository;

    @Transactional
    public Long createInquiry(Long userId, InquiryCreateRequest req) {
        if (userId == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);
        if (req.getCategory() == null || req.getInquiryTitle() == null || req.getInquiryTitle().isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "category/inquiryTitle은 필수입니다.");
        }

        Inquiry inquiry = Inquiry.builder()
                .userId(userId)
                .category(req.getCategory())
                .inquiryTitle(req.getInquiryTitle())
                .content(req.getContent())
                .status(InquiryStatus.OPEN)
                .build();

        return inquiryRepository.save(inquiry).getInquiryId();
    }

    public Page<InquiryResponse> getMyInquiries(Long userId, InquiryStatus status, Pageable pageable) {
        if (userId == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);

        Page<Inquiry> page = (status == null)
                ? inquiryRepository.findByUserId(userId, pageable)
                : inquiryRepository.findByUserIdAndStatus(userId, status, pageable);

        return page.map(InquiryResponse::from);
    }

    public InquiryResponse getMyInquiry(Long userId, Long inquiryId) {
        if (userId == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);

        Inquiry inquiry = inquiryRepository.findByInquiryIdAndUserId(inquiryId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "문의가 존재하지 않습니다."));

        return InquiryResponse.from(inquiry);
    }

    @Transactional
    public void updateMyInquiry(Long userId, Long inquiryId, InquiryUpdateRequest req) {
        if (userId == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);

        Inquiry inquiry = inquiryRepository.findByInquiryIdAndUserId(inquiryId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "문의가 존재하지 않습니다."));

        if (inquiry.getStatus() != InquiryStatus.OPEN) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "OPEN 상태에서만 수정할 수 있습니다.");
        }

        if (req.getCategory() == null || req.getInquiryTitle() == null || req.getInquiryTitle().isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "category/inquiryTitle은 필수입니다.");
        }

        inquiry.update(req.getInquiryTitle(), req.getContent(), req.getCategory());
    }

    @Transactional
    public void closeMyInquiry(Long userId, Long inquiryId) {
        if (userId == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);

        Inquiry inquiry = inquiryRepository.findByInquiryIdAndUserId(inquiryId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "문의가 존재하지 않습니다."));

        inquiry.changeStatus(InquiryStatus.CLOSED);
    }
}
