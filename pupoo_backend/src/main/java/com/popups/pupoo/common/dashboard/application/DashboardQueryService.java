// file: src/main/java/com/popups/pupoo/common/dashboard/application/DashboardQueryService.java
package com.popups.pupoo.common.dashboard.application;

import com.popups.pupoo.common.dashboard.dto.AdminDashboardResponse;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.inquiry.persistence.InquiryRepository;
import com.popups.pupoo.notice.persistence.NoticeRepository;
import com.popups.pupoo.payment.persistence.PaymentRepository;
import com.popups.pupoo.payment.refund.persistence.RefundRepository;
import com.popups.pupoo.user.persistence.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 관리자 대시보드 Query Service
 * - 복잡한 통계는 추후 확장(집계 테이블/캐시/리포트용 쿼리) 가능
 */
@Service
@Transactional(readOnly = true)
public class DashboardQueryService {

    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final PaymentRepository paymentRepository;
    private final RefundRepository refundRepository;
    private final InquiryRepository inquiryRepository;
    private final NoticeRepository noticeRepository;

    public DashboardQueryService(UserRepository userRepository,
                                 EventRepository eventRepository,
                                 PaymentRepository paymentRepository,
                                 RefundRepository refundRepository,
                                 InquiryRepository inquiryRepository,
                                 NoticeRepository noticeRepository) {
        this.userRepository = userRepository;
        this.eventRepository = eventRepository;
        this.paymentRepository = paymentRepository;
        this.refundRepository = refundRepository;
        this.inquiryRepository = inquiryRepository;
        this.noticeRepository = noticeRepository;
    }

    public AdminDashboardResponse summary() {
        return new AdminDashboardResponse(
                userRepository.count(),
                eventRepository.count(),
                paymentRepository.count(),
                refundRepository.count(),
                inquiryRepository.count(),
                noticeRepository.count(),
                LocalDateTime.now()
        );
    }
}
