// file: src/main/java/com/popups/pupoo/event/application/EventRegistrationAdminService.java
package com.popups.pupoo.event.application;

import com.popups.pupoo.common.audit.application.AdminLogService;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.event.domain.enums.RegistrationStatus;
import com.popups.pupoo.event.domain.model.EventRegistration;
import com.popups.pupoo.event.dto.EventRegistrationResponse;
import com.popups.pupoo.event.persistence.EventRegistrationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자용 참가 신청 처리 서비스
 * - 상태 전이 강제:
 *   APPLIED -> APPROVED / REJECTED
 *   APPROVED -> CANCELLED(운영 취소)
 * - admin_logs: 쓰기 작업만 기록
 */
@Service
public class EventRegistrationAdminService {

    private final EventRegistrationRepository registrationRepository;
    private final AdminLogService adminLogService;

    public EventRegistrationAdminService(EventRegistrationRepository registrationRepository,
                                         AdminLogService adminLogService) {
        this.registrationRepository = registrationRepository;
        this.adminLogService = adminLogService;
    }

    /**
     * 관리자 승인: APPLIED -> APPROVED
     */
    @Transactional
    public EventRegistrationResponse approve(Long applyId, String reason) {
        EventRegistration reg = registrationRepository.findByApplyIdForUpdate(applyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EVENT_REGISTRATION_NOT_FOUND));

        if (reg.getStatus() == RegistrationStatus.APPROVED) {
            return EventRegistrationResponse.from(reg);
        }
        if (reg.getStatus() != RegistrationStatus.APPLIED) {
            throw new BusinessException(ErrorCode.EVENT_REGISTRATION_INVALID_STATUS);
        }

        reg.approve();

        adminLogService.write(
                "EVENT_REG_APPROVE" + (reason == null || reason.isBlank() ? "" : "|" + reason),
                AdminTargetType.EVENT,
                reg.getApplyId()
        );

        return EventRegistrationResponse.from(reg);
    }

    /**
     * 관리자 거절: APPLIED -> REJECTED
     */
    @Transactional
    public EventRegistrationResponse reject(Long applyId, String reason) {
        EventRegistration reg = registrationRepository.findByApplyIdForUpdate(applyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EVENT_REGISTRATION_NOT_FOUND));

        if (reg.getStatus() == RegistrationStatus.REJECTED) {
            return EventRegistrationResponse.from(reg);
        }
        if (reg.getStatus() != RegistrationStatus.APPLIED) {
            throw new BusinessException(ErrorCode.EVENT_REGISTRATION_INVALID_STATUS);
        }

        reg.reject();

        adminLogService.write(
                "EVENT_REG_REJECT" + (reason == null || reason.isBlank() ? "" : "|" + reason),
                AdminTargetType.EVENT,
                reg.getApplyId()
        );

        return EventRegistrationResponse.from(reg);
    }

    /**
     * 관리자 취소: APPROVED -> CANCELLED
     */
    @Transactional
    public EventRegistrationResponse cancelApproved(Long applyId, String reason) {
        EventRegistration reg = registrationRepository.findByApplyIdForUpdate(applyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EVENT_REGISTRATION_NOT_FOUND));

        if (reg.getStatus() == RegistrationStatus.CANCELLED) {
            return EventRegistrationResponse.from(reg);
        }
        if (reg.getStatus() != RegistrationStatus.APPROVED) {
            throw new BusinessException(ErrorCode.EVENT_REGISTRATION_INVALID_STATUS);
        }

        reg.cancel();

        adminLogService.write(
                "EVENT_REG_CANCEL" + (reason == null || reason.isBlank() ? "" : "|" + reason),
                AdminTargetType.EVENT,
                reg.getApplyId()
        );

        return EventRegistrationResponse.from(reg);
    }

}
