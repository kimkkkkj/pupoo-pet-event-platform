// file: src/main/java/com/popups/pupoo/inquiry/application/InquiryAdminService.java
package com.popups.pupoo.inquiry.application;

import com.popups.pupoo.common.audit.application.AdminLogService;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.inquiry.domain.enums.InquiryStatus;
import com.popups.pupoo.inquiry.domain.model.Inquiry;
import com.popups.pupoo.inquiry.domain.model.InquiryAnswer;
import com.popups.pupoo.inquiry.dto.InquiryAnswerRequest;
import com.popups.pupoo.inquiry.dto.InquiryResponse;
import com.popups.pupoo.inquiry.persistence.InquiryAnswerRepository;
import com.popups.pupoo.inquiry.persistence.InquiryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InquiryAdminService {

    private final InquiryRepository inquiryRepository;
    private final InquiryAnswerRepository inquiryAnswerRepository;
    private final AdminLogService adminLogService;

    public Page<InquiryResponse> getInquiries(InquiryStatus status, String keyword, Pageable pageable) {
        return inquiryRepository.search(status, keyword, pageable).map(InquiryResponse::from);
    }

    @Transactional
    public void answer(Long adminUserId, Long inquiryId, InquiryAnswerRequest req) {
        if (adminUserId == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);

        if (req.getAnswerContent() == null || req.getAnswerContent().isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "answerContent는 필수입니다.");
        }

        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "문의가 존재하지 않습니다."));

        InquiryAnswer answer = InquiryAnswer.builder()
                .inquiry(inquiry)
                .adminId(adminUserId)
                .content(req.getAnswerContent())
                .build();

        inquiryAnswerRepository.save(answer);

        inquiry.changeStatus(InquiryStatus.IN_PROGRESS);

        adminLogService.write("INQUIRY_ANSWER", AdminTargetType.OTHER, inquiryId);
    }

    @Transactional
    public void changeStatus(Long inquiryId, InquiryStatus status) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "문의가 존재하지 않습니다."));

        if (status == null) throw new BusinessException(ErrorCode.VALIDATION_FAILED, "status는 필수입니다.");

        inquiry.changeStatus(status);

        adminLogService.write("INQUIRY_CHANGE_STATUS:" + status, AdminTargetType.OTHER, inquiryId);
    }
}
