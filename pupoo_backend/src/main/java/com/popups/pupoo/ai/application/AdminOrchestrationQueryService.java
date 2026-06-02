package com.popups.pupoo.ai.application;

import com.popups.pupoo.ai.dto.AdminOrchestrationCapabilitiesResponse;
import com.popups.pupoo.ai.dto.AdminOrchestrationSummaryResponse;
import com.popups.pupoo.common.dashboard.application.AdminDashboardRealtimeQueryService;
import com.popups.pupoo.common.dashboard.dto.AdminRealtimeSummaryResponse;
import com.popups.pupoo.event.domain.enums.RegistrationStatus;
import com.popups.pupoo.event.persistence.EventRegistrationRepository;
import com.popups.pupoo.notice.application.NoticeAdminService;
import com.popups.pupoo.notice.domain.enums.NoticeStatus;
import com.popups.pupoo.notice.dto.NoticeResponse;
import com.popups.pupoo.notice.persistence.NoticeRepository;
import com.popups.pupoo.notification.application.AdminNotificationManageService;
import com.popups.pupoo.notification.domain.enums.AdminNotificationStatus;
import com.popups.pupoo.notification.dto.AdminNotificationItemResponse;
import com.popups.pupoo.notification.persistence.AdminNotificationRepository;
import com.popups.pupoo.payment.refund.domain.enums.RefundStatus;
import com.popups.pupoo.payment.refund.persistence.RefundRepository;
import com.popups.pupoo.program.apply.domain.enums.ApplyStatus;
import com.popups.pupoo.program.apply.persistence.ProgramApplyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class AdminOrchestrationQueryService {

    private static final int DEFAULT_RECENT_LIMIT = 5;

    private final AdminDashboardRealtimeQueryService adminDashboardRealtimeQueryService;
    private final NoticeRepository noticeRepository;
    private final NoticeAdminService noticeAdminService;
    private final AdminNotificationRepository adminNotificationRepository;
    private final AdminNotificationManageService adminNotificationManageService;
    private final EventRegistrationRepository eventRegistrationRepository;
    private final ProgramApplyRepository programApplyRepository;
    private final RefundRepository refundRepository;

    public AdminOrchestrationQueryService(AdminDashboardRealtimeQueryService adminDashboardRealtimeQueryService,
                                          NoticeRepository noticeRepository,
                                          NoticeAdminService noticeAdminService,
                                          AdminNotificationRepository adminNotificationRepository,
                                          AdminNotificationManageService adminNotificationManageService,
                                          EventRegistrationRepository eventRegistrationRepository,
                                          ProgramApplyRepository programApplyRepository,
                                          RefundRepository refundRepository) {
        this.adminDashboardRealtimeQueryService = adminDashboardRealtimeQueryService;
        this.noticeRepository = noticeRepository;
        this.noticeAdminService = noticeAdminService;
        this.adminNotificationRepository = adminNotificationRepository;
        this.adminNotificationManageService = adminNotificationManageService;
        this.eventRegistrationRepository = eventRegistrationRepository;
        this.programApplyRepository = programApplyRepository;
        this.refundRepository = refundRepository;
    }

    public AdminOrchestrationSummaryResponse summary() {
        AdminRealtimeSummaryResponse realtime = adminDashboardRealtimeQueryService.summary();
        List<NoticeResponse> recentNotices = noticeAdminService
                .list(0, DEFAULT_RECENT_LIMIT, null, null, null, null)
                .getContent();
        List<AdminNotificationItemResponse> recentNotifications = adminNotificationManageService.list().stream()
                .limit(DEFAULT_RECENT_LIMIT)
                .toList();

        return new AdminOrchestrationSummaryResponse(
                new AdminOrchestrationSummaryResponse.CongestionSummary(
                        realtime.getPlannedCount(),
                        realtime.getOngoingCount(),
                        realtime.getEndedCount(),
                        realtime.getCancelledCount(),
                        realtime.getTodayCheckinCount()
                ),
                new AdminOrchestrationSummaryResponse.ApplicantSummary(
                        new AdminOrchestrationSummaryResponse.EventRegistrationSummary(
                                eventRegistrationRepository.countByStatus(RegistrationStatus.APPLIED),
                                eventRegistrationRepository.countByStatus(RegistrationStatus.APPROVED),
                                eventRegistrationRepository.countByStatus(RegistrationStatus.REJECTED),
                                eventRegistrationRepository.countByStatus(RegistrationStatus.CANCELLED),
                                eventRegistrationRepository.countByStatus(RegistrationStatus.APPLIED)
                                        + eventRegistrationRepository.countByStatus(RegistrationStatus.APPROVED)
                        ),
                        new AdminOrchestrationSummaryResponse.ProgramApplySummary(
                                programApplyRepository.countByStatus(ApplyStatus.APPLIED),
                                programApplyRepository.countByStatus(ApplyStatus.WAITING),
                                programApplyRepository.countByStatus(ApplyStatus.APPROVED),
                                programApplyRepository.countByStatus(ApplyStatus.REJECTED),
                                programApplyRepository.countByStatus(ApplyStatus.CANCELLED),
                                programApplyRepository.countByStatus(ApplyStatus.CHECKED_IN),
                                programApplyRepository.countByStatus(ApplyStatus.APPLIED)
                                        + programApplyRepository.countByStatus(ApplyStatus.WAITING)
                                        + programApplyRepository.countByStatus(ApplyStatus.APPROVED)
                        ),
                        new AdminOrchestrationSummaryResponse.ApplicantInterpretation(
                                List.of(RegistrationStatus.APPLIED.name(), RegistrationStatus.APPROVED.name()),
                                List.of(ApplyStatus.APPLIED.name(), ApplyStatus.WAITING.name(), ApplyStatus.APPROVED.name()),
                                "activeCount = APPLIED + APPROVED",
                                "activeCount = APPLIED + WAITING + APPROVED",
                                "checkedInCount는 CHECKED_IN 상태 건수다."
                        )
                ),
                new AdminOrchestrationSummaryResponse.NoticeSummary(
                        noticeRepository.countByStatus(NoticeStatus.PUBLISHED),
                        noticeRepository.countByStatus(NoticeStatus.DRAFT),
                        noticeRepository.countByStatus(NoticeStatus.HIDDEN),
                        recentNotices
                ),
                new AdminOrchestrationSummaryResponse.NotificationSummary(
                        adminNotificationRepository.countVisibleByStatus(AdminNotificationStatus.DRAFT),
                        adminNotificationRepository.countVisibleByStatus(AdminNotificationStatus.SENT),
                        recentNotifications
                ),
                new AdminOrchestrationSummaryResponse.RefundSummary(
                        refundRepository.countByStatus(RefundStatus.REQUESTED),
                        refundRepository.countByStatus(RefundStatus.APPROVED),
                        refundRepository.countByStatus(RefundStatus.REJECTED),
                        refundRepository.countByStatus(RefundStatus.COMPLETED),
                        refundRepository.count()
                )
        );
    }

    public AdminOrchestrationCapabilitiesResponse capabilities() {
        return new AdminOrchestrationCapabilitiesResponse(
                new AdminOrchestrationCapabilitiesResponse.SummaryCapability(
                        true,
                        "/api/admin/ai/summary",
                        "혼잡도 요약, 신청 현황, 공지/알림/환불 현황을 조회한다."
                ),
                new AdminOrchestrationCapabilitiesResponse.NoticeCapability(
                        true,
                        true,
                        true,
                        true,
                        true,
                        true,
                        true,
                        true,
                        "/api/admin/notices",
                        "/api/admin/notices/{id}",
                        "공지 저장 시 request.status 값으로 DRAFT, PUBLISHED, HIDDEN 중 하나를 명시한다."
                ),
                new AdminOrchestrationCapabilitiesResponse.NotificationCapability(
                        true,
                        true,
                        true,
                        true,
                        true,
                        true,
                        false,
                        "/api/admin/notifications",
                        "/api/admin/notifications/{adminNotificationId}/send",
                        "예약 발송은 RDS admin_notification 스키마에 scheduled_at과 예약 상태가 없어 미지원이다."
                ),
                new AdminOrchestrationCapabilitiesResponse.RefundCapability(
                        true,
                        true,
                        true,
                        true,
                        true,
                        "/api/admin/refunds",
                        "/api/admin/refunds/{id}"
                ),
                List.of(
                        new AdminOrchestrationCapabilitiesResponse.ActionCapability(
                                "notice_save_draft",
                                true,
                                "POST",
                                "/api/admin/notices",
                                "status=DRAFT로 저장한다."
                        ),
                        new AdminOrchestrationCapabilitiesResponse.ActionCapability(
                                "notice_publish",
                                true,
                                "POST",
                                "/api/admin/notices",
                                "status=PUBLISHED로 저장한다."
                        ),
                        new AdminOrchestrationCapabilitiesResponse.ActionCapability(
                                "notice_hide",
                                true,
                                "POST/PATCH",
                                "/api/admin/notices 또는 /api/admin/notices/{id}",
                                "신규 저장 시 status=HIDDEN, 기존 공지는 PATCH 또는 DELETE 흐름을 사용한다."
                        ),
                        new AdminOrchestrationCapabilitiesResponse.ActionCapability(
                                "notification_draft_create",
                                true,
                                "POST",
                                "/api/admin/notifications",
                                "알림 초안을 생성한다."
                        ),
                        new AdminOrchestrationCapabilitiesResponse.ActionCapability(
                                "notification_draft_update",
                                true,
                                "PUT",
                                "/api/admin/notifications/{adminNotificationId}",
                                "기존 알림 초안을 수정한다."
                        ),
                        new AdminOrchestrationCapabilitiesResponse.ActionCapability(
                                "notification_draft_delete",
                                true,
                                "DELETE",
                                "/api/admin/notifications/{adminNotificationId}",
                                "알림 초안을 삭제한다."
                        ),
                        new AdminOrchestrationCapabilitiesResponse.ActionCapability(
                                "notification_draft_send",
                                true,
                                "POST",
                                "/api/admin/notifications/{adminNotificationId}/send",
                                "저장한 알림 초안을 즉시 발송한다."
                        ),
                        new AdminOrchestrationCapabilitiesResponse.ActionCapability(
                                "notification_event_send",
                                true,
                                "POST",
                                "/api/admin/notifications/event",
                                "이벤트 기반 알림을 즉시 발송한다."
                        ),
                        new AdminOrchestrationCapabilitiesResponse.ActionCapability(
                                "notification_broadcast_send",
                                true,
                                "POST",
                                "/api/admin/notifications/broadcast",
                                "전체 대상 알림을 즉시 발송한다."
                        ),
                        new AdminOrchestrationCapabilitiesResponse.ActionCapability(
                                "notification_scheduled_send",
                                false,
                                "UNSUPPORTED",
                                "",
                                "RDS admin_notification 스키마에 예약 발송 컬럼과 상태가 없어 미지원이다."
                        ),
                        new AdminOrchestrationCapabilitiesResponse.ActionCapability(
                                "refund_list",
                                true,
                                "GET",
                                "/api/admin/refunds",
                                "환불 목록을 조회한다."
                        ),
                        new AdminOrchestrationCapabilitiesResponse.ActionCapability(
                                "refund_detail",
                                true,
                                "GET",
                                "/api/admin/refunds/{id}",
                                "환불 상세를 조회한다."
                        ),
                        new AdminOrchestrationCapabilitiesResponse.ActionCapability(
                                "refund_approve",
                                true,
                                "PATCH",
                                "/api/admin/refunds/{refundId}/approve",
                                "REQUESTED 환불을 승인한다."
                        ),
                        new AdminOrchestrationCapabilitiesResponse.ActionCapability(
                                "refund_reject",
                                true,
                                "PATCH",
                                "/api/admin/refunds/{refundId}/reject",
                                "REQUESTED 환불을 거절한다."
                        ),
                        new AdminOrchestrationCapabilitiesResponse.ActionCapability(
                                "refund_execute",
                                true,
                                "POST",
                                "/api/admin/refunds/{refundId}/execute",
                                "APPROVED 환불을 실제 실행한다."
                        )
                )
        );
    }
}
