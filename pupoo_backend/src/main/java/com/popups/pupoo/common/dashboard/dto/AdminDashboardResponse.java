// file: src/main/java/com/popups/pupoo/common/dashboard/dto/AdminDashboardResponse.java
package com.popups.pupoo.common.dashboard.dto;

import java.time.LocalDateTime;

/**
 * 관리자 대시보드 요약 응답
 * - 운영용 핵심 숫자만 제공 (발표/데모 단계)
 */
public class AdminDashboardResponse {

    private final long totalUsers;
    private final long totalEvents;
    private final long totalPayments;
    private final long totalRefunds;
    private final long totalInquiries;
    private final long totalNotices;

    private final LocalDateTime generatedAt;

    public AdminDashboardResponse(long totalUsers,
                                 long totalEvents,
                                 long totalPayments,
                                 long totalRefunds,
                                 long totalInquiries,
                                 long totalNotices,
                                 LocalDateTime generatedAt) {
        this.totalUsers = totalUsers;
        this.totalEvents = totalEvents;
        this.totalPayments = totalPayments;
        this.totalRefunds = totalRefunds;
        this.totalInquiries = totalInquiries;
        this.totalNotices = totalNotices;
        this.generatedAt = generatedAt;
    }

    public long getTotalUsers() { return totalUsers; }
    public long getTotalEvents() { return totalEvents; }
    public long getTotalPayments() { return totalPayments; }
    public long getTotalRefunds() { return totalRefunds; }
    public long getTotalInquiries() { return totalInquiries; }
    public long getTotalNotices() { return totalNotices; }
    public LocalDateTime getGeneratedAt() { return generatedAt; }
}
